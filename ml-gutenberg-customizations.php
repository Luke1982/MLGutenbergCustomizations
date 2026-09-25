<?php
/**
 * Plugin Name: MajorLabel Gutenberg Customizations
 * Description: Custom margin and padding controls for mobile screens in the Gutenberg editor.
 * Version: 1.7.1
 * Requires at least: 6.2
 * Requires PHP: 7.4
 * Text Domain: ml-gutenberg-customizations
 *
 * @package ML_Gutenberg_Customizations
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers mobile spacing controls for supported Gutenberg blocks.
 */
class ML_Gutenberg_Customizations {

	/**
	 * Blocks that receive mobile spacing controls.
	 */
	private const SUPPORTED_BLOCKS = array(
		'core/columns',
		'core/column',
		'core/group',
	);

	/**
	 * Register hooks for editor assets, block assets, and render filters.
	 */
	public function __construct() {
		add_action( 'init', array( $this, 'register_term_image_block' ) );
		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_editor_assets' ) );
		add_action( 'enqueue_block_assets', array( $this, 'enqueue_block_assets' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_frontend_assets' ) );

		foreach ( self::SUPPORTED_BLOCKS as $block ) {
			add_filter( "render_block_{$block}", array( $this, 'apply_block_customizations' ), 10, 3 );
		}

		// Fallback: catch inner blocks rendered by third-party plugins
		// (e.g. terms-query) that bypass render_block() for children.
		add_filter( 'render_block', array( $this, 'process_parent_block_links' ), 20, 2 );

		add_filter( 'render_block_core/cover', array( $this, 'apply_cover_vertical_align' ), 10, 2 );

		// 3D transforms apply to every block, not only SUPPORTED_BLOCKS.
		add_filter( 'register_block_type_args', array( $this, 'register_transform_3d_attribute' ) );
		add_filter( 'render_block', array( $this, 'apply_transform_3d' ), 10, 2 );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_transform_3d_styles' ) );
		add_action( 'enqueue_block_assets', array( $this, 'enqueue_transform_3d_editor_styles' ) );

		// Scroll reveal + scroll-linked effects, also on every block.
		add_filter( 'register_block_type_args', array( $this, 'register_scroll_animation_attributes' ) );
		add_filter( 'render_block', array( $this, 'apply_scroll_animation' ), 10, 2 );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_scroll_animation_assets' ) );
		add_action( 'wp_head', array( $this, 'print_scroll_ready_class' ), 1 );

		// Cycling text, paragraphs only.
		add_filter( 'register_block_type_args', array( $this, 'register_typewriter_attribute' ), 10, 2 );
		add_filter( 'render_block_core/paragraph', array( $this, 'apply_typewriter' ), 10, 2 );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_typewriter_assets' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_typewriter_styles' ) );
	}

	/**
	 * Derive the mobile breakpoint from the WordPress content width setting.
	 *
	 * Falls back to 650px when the value cannot be determined or uses
	 * CSS functions (clamp / calc) that are invalid inside @media queries.
	 */
	private function get_mobile_breakpoint(): string {
		$layout       = wp_get_global_settings( array( 'layout' ) );
		$content_size = ! empty( $layout['contentSize'] ) ? $layout['contentSize'] : '';

		if ( empty( $content_size ) || false !== strpos( $content_size, '(' ) ) {
			return '650px';
		}

		return $content_size;
	}

	/**
	 * Enqueue the editor script and pass the mobile breakpoint to JS.
	 */
	public function enqueue_editor_assets(): void {
		$asset_file = plugin_dir_path( __FILE__ ) . 'build/index.asset.php';

		if ( ! file_exists( $asset_file ) ) {
			return;
		}

		$asset = include $asset_file;

		wp_enqueue_script(
			'ml-gutenberg-customizations-editor',
			plugin_dir_url( __FILE__ ) . 'build/index.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		wp_localize_script(
			'ml-gutenberg-customizations-editor',
			'mlGutenbergCustomizations',
			array(
				'mobileBreakpoint' => $this->get_mobile_breakpoint(),
			)
		);
	}

	/**
	 * Enqueue the mobile utility stylesheet for both editor and frontend.
	 *
	 * The <link> tag receives a media attribute set to the content width so
	 * the rules only apply below that viewport size.
	 */
	public function enqueue_block_assets(): void {
		$css_file = plugin_dir_path( __FILE__ ) . 'build/style-index.css';

		if ( ! file_exists( $css_file ) ) {
			return;
		}

		wp_enqueue_style(
			'ml-gutenberg-mobile-spacing',
			plugin_dir_url( __FILE__ ) . 'build/style-index.css',
			array(),
			filemtime( $css_file ),
			'(max-width: ' . esc_attr( $this->get_mobile_breakpoint() ) . ')'
		);

		// Stretched-link styles — must apply at all viewports.
		// Cannot use wp_add_inline_style on the mobile stylesheet because it
		// inherits the parent's media attribute.
		wp_register_style( 'ml-gutenberg-link-block', false, array(), '1.0' );
		wp_enqueue_style( 'ml-gutenberg-link-block' );
		wp_add_inline_style(
			'ml-gutenberg-link-block',
			'.ml-has-link{position:relative;cursor:pointer}'
			. '.ml-block-link{position:absolute;inset:0;z-index:1}'
			. '.ml-has-link a:not(.ml-block-link),.ml-has-link button,.ml-has-link input,.ml-has-link select,.ml-has-link textarea{position:relative;z-index:2}'
		);
	}

	/**
	 * Enqueue the frontend scroll-behavior script.
	 *
	 * Registered separately from block assets so it only loads on the
	 * frontend (not inside the block editor) and in the footer.
	 */
	public function enqueue_frontend_assets(): void {
		$asset_file = plugin_dir_path( __FILE__ ) . 'build/scroll-behavior.asset.php';

		if ( ! file_exists( $asset_file ) ) {
			return;
		}

		$asset = include $asset_file;

		wp_enqueue_script(
			'ml-gutenberg-scroll-behavior',
			plugin_dir_url( __FILE__ ) . 'build/scroll-behavior.js',
			$asset['dependencies'],
			$asset['version'],
			true // Load in footer.
		);

		wp_localize_script(
			'ml-gutenberg-scroll-behavior',
			'mlScrollBehavior',
			array(
				'mobileBreakpoint' => $this->get_mobile_breakpoint(),
			)
		);
	}

	/**
	 * Apply block customizations to the rendered block markup.
	 *
	 * Uses WP_HTML_Tag_Processor (WP 6.2+) so the changes are applied at
	 * render time — no block-validation errors if the plugin is removed.
	 *
	 * Handles: mobile spacing, visibility (mobile-only / desktop-only),
	 * custom margins, min-width, full hidden state, and link overlays.
	 * When a custom breakpoint is set on a block, inline CSS is output
	 * inside a scoped @media query targeting that specific element.
	 *
	 * @param string         $block_content The block's rendered HTML.
	 * @param array          $block         The parsed block data.
	 * @param \WP_Block|null $instance      Block instance with resolved context.
	 * @return string Modified block HTML.
	 */
	public function apply_block_customizations( string $block_content, array $block, ?\WP_Block $instance = null ): string {
		$attrs                     = $block['attrs'] ?? array();
		$block_context             = ( $instance instanceof \WP_Block && is_array( $instance->context ) )
			? $instance->context
			: ( is_array( $block['context'] ?? null ) ? $block['context'] : array() );
		$padding                   = is_array( $attrs['mlMobilePadding'] ?? null ) ? $attrs['mlMobilePadding'] : array();
		$margin                    = is_array( $attrs['mlMobileMargin'] ?? null ) ? $attrs['mlMobileMargin'] : array();
		$custom_margin             = is_array( $attrs['mlCustomMargin'] ?? null ) ? $attrs['mlCustomMargin'] : array();
		$custom_margin_mobile_only = ! empty( $attrs['mlCustomMarginMobileOnly'] );
		$custom_margin_override    = is_array( $attrs['mlCustomMarginMobileOverride'] ?? null ) ? $attrs['mlCustomMarginMobileOverride'] : array();
		$flex_column               = ! empty( $attrs['mlMobileFlexColumn'] );
		$justify_content           = isset( $attrs['mlMobileJustifyContent'] ) && '' !== $attrs['mlMobileJustifyContent']
			? sanitize_key( $attrs['mlMobileJustifyContent'] )
			: '';
		$flex_basis                = isset( $attrs['mlMobileFlexBasis'] ) && '' !== $attrs['mlMobileFlexBasis']
			? $attrs['mlMobileFlexBasis']
			: '';
		$custom_min_width          = isset( $attrs['mlCustomMinWidth'] ) && '' !== $attrs['mlCustomMinWidth']
			? $attrs['mlCustomMinWidth']
			: '';
		$is_hidden                 = ! empty( $attrs['mlHidden'] );
		$visibility                = isset( $attrs['mlVisibility'] ) && '' !== $attrs['mlVisibility']
			? sanitize_key( $attrs['mlVisibility'] )
			: 'all';
		$is_mobile_hidden          = 'desktop-only' === $visibility;
		$is_mobile_only            = 'mobile-only' === $visibility;
		$link_url                  = isset( $attrs['mlLinkUrl'] ) && '' !== $attrs['mlLinkUrl']
			? $attrs['mlLinkUrl']
			: '';
		$link_type                 = isset( $attrs['mlLinkType'] ) && '' !== $attrs['mlLinkType']
			? sanitize_key( $attrs['mlLinkType'] )
			: '';
		$link_taxonomy             = isset( $attrs['mlLinkTaxonomy'] ) && '' !== $attrs['mlLinkTaxonomy']
			? sanitize_key( $attrs['mlLinkTaxonomy'] )
			: 'category';
		$link_target               = isset( $attrs['mlLinkTarget'] ) && '' !== $attrs['mlLinkTarget']
			? $attrs['mlLinkTarget']
			: '';
		$custom_bp                 = isset( $attrs['mlMobileBreakpoint'] ) ? absint( $attrs['mlMobileBreakpoint'] ) : 0;
		$has_custom_bp             = $custom_bp > 0;
		$scroll_behavior           = is_array( $attrs['mlScrollBehavior'] ?? null ) ? $attrs['mlScrollBehavior'] : array();
		$has_scroll                = ! empty( $scroll_behavior['enabled'] );
		$sides                     = array( 'top', 'right', 'bottom', 'left' );
		$classes                   = array();
		$inline_rules              = array();

		if ( empty( $link_url ) && $link_type ) {
			if ( 'post' === $link_type ) {
				$post_id = isset( $block_context['postId'] ) ? absint( $block_context['postId'] ) : 0;

				if ( ! $post_id ) {
					$post_id = get_the_ID() ? absint( get_the_ID() ) : 0;
				}

				if ( $post_id ) {
					$post_link = get_permalink( $post_id );
					if ( is_string( $post_link ) ) {
						$link_url = $post_link;
					}
				}
			} elseif ( 'term' === $link_type ) {
				$term = null;

				foreach ( array( 'termId', 'term_id', 'queriedTermId' ) as $term_context_key ) {
					if ( isset( $block_context[ $term_context_key ] ) ) {
						$term_id = absint( $block_context[ $term_context_key ] );
						if ( $term_id ) {
							$term_candidate = taxonomy_exists( $link_taxonomy )
								? get_term( $term_id, $link_taxonomy )
								: get_term( $term_id );
							if ( $term_candidate instanceof \WP_Term ) {
								$term = $term_candidate;
								break;
							}
						}
					}
				}

				if ( ! $term ) {
					$post_id = isset( $block_context['postId'] ) ? absint( $block_context['postId'] ) : 0;

					if ( ! $post_id ) {
						$post_id = get_the_ID() ? absint( get_the_ID() ) : 0;
					}

					if ( $post_id && taxonomy_exists( $link_taxonomy ) ) {
						$terms = get_the_terms( $post_id, $link_taxonomy );
						if ( ! empty( $terms ) && ! is_wp_error( $terms ) ) {
							$term_candidate = reset( $terms );
							if ( $term_candidate instanceof \WP_Term ) {
								$term = $term_candidate;
							}
						}
					}
				}

				if ( $term instanceof \WP_Term ) {
					$term_link = get_term_link( $term );
					if ( ! is_wp_error( $term_link ) && is_string( $term_link ) ) {
						$link_url = $term_link;
					}
				}
			}
		}

		// Custom margin — supports negative values.
		$custom_margin_declarations = array();
		foreach ( $sides as $side ) {
			if ( isset( $custom_margin[ $side ] ) && '' !== $custom_margin[ $side ] ) {
				$custom_margin_declarations[] = "margin-{$side}:" . esc_attr( $custom_margin[ $side ] ) . ' !important';
			}
		}

		if ( $flex_column && ! $has_custom_bp ) {
			$classes[] = 'has-mobile-flex-column';
		}

		$justify_map = array(
			'left'          => 'flex-start',
			'center'        => 'center',
			'right'         => 'flex-end',
			'space-between' => 'space-between',
			'space-around'  => 'space-around',
		);

		if ( $justify_content && isset( $justify_map[ $justify_content ] ) ) {
			if ( $has_custom_bp ) {
				$inline_rules[] = 'justify-content:' . $justify_map[ $justify_content ] . ' !important';
			} else {
				$classes[] = sanitize_html_class( 'has-mobile-justify-' . $justify_content );
			}
		}

		if ( $flex_basis && ! $has_custom_bp ) {
			$classes[] = 'has-mobile-flex-basis';
		}

		foreach ( $sides as $side ) {
			if ( isset( $padding[ $side ] ) && '' !== $padding[ $side ] ) {
				if ( $has_custom_bp ) {
					$val = '0' === $padding[ $side ]
						? '0'
						: 'var(--wp--preset--spacing--' . $padding[ $side ] . ')';

					$inline_rules[] = "padding-{$side}:{$val} !important";
				} else {
					$classes[] = sanitize_html_class( "has-mobile-padding-{$side}-{$padding[$side]}" );
				}
			}
			if ( isset( $margin[ $side ] ) && '' !== $margin[ $side ] ) {
				if ( $has_custom_bp ) {
					$val = '0' === $margin[ $side ]
						? '0'
						: 'var(--wp--preset--spacing--' . $margin[ $side ] . ')';

					$inline_rules[] = "margin-{$side}:{$val} !important";
				} else {
					$classes[] = sanitize_html_class( "has-mobile-margin-{$side}-{$margin[$side]}" );
				}
			}
		}

		if ( $flex_column && $has_custom_bp ) {
			$inline_rules[] = 'flex-direction:column !important';
		}

		if ( $flex_basis && $has_custom_bp ) {
			$inline_rules[] = 'flex-basis:' . esc_attr( $flex_basis ) . ' !important';
		}

		if ( empty( $classes ) && empty( $inline_rules ) && empty( $custom_margin_declarations ) && empty( $flex_basis ) && empty( $custom_min_width ) && ! $is_hidden && 'all' === $visibility && empty( $link_url ) && ! $has_scroll ) {
			return $block_content;
		}

		// Initialize inline style before any usage.
		$inline_style = '';
		$scoped_class = '';

		if ( $is_mobile_hidden ) {
			if ( $has_custom_bp ) {
				$inline_rules[] = 'display:none !important';
			} else {
				// Generate inline CSS with media query for the global breakpoint
				$bp            = (int) $this->get_mobile_breakpoint();
				$scoped_class  = 'ml-mobile-' . substr( md5( wp_json_encode( $attrs ) . $block_content ), 0, 8 );
				$classes[]     = $scoped_class;
				$inline_style .= sprintf(
					'<style>@media(max-width:%dpx){.%s{display:none !important}}</style>',
					$bp,
					$scoped_class
				);
			}
		}

		if ( $is_mobile_only ) {
			$bp            = $has_custom_bp ? $custom_bp : (int) $this->get_mobile_breakpoint();
			$scoped_class  = 'ml-mobile-' . substr( md5( wp_json_encode( $attrs ) . $block_content ), 0, 8 );
			$classes[]     = $scoped_class;
			$inline_style .= sprintf(
				'<style>.%s{display:none !important}@media(max-width:%dpx){.%s{display:revert !important}}</style>',
				$scoped_class,
				$bp,
				$scoped_class
			);
		}

		if ( ! empty( $inline_rules ) || ( ! empty( $custom_margin_declarations ) && $custom_margin_mobile_only ) ) {
			// Only regenerate scoped_class if not already set by mobile hidden.
			if ( empty( $scoped_class ) ) {
				$scoped_class = 'ml-mobile-' . substr( md5( wp_json_encode( $attrs ) . $block_content ), 0, 8 );
			}
			$classes[] = $scoped_class;
		}

		if ( ! empty( $inline_rules ) ) {
			$rules_str     = implode( ';', $inline_rules );
			$inline_style .= sprintf(
				'<style>@media(max-width:%dpx){.%s{%s}}</style>',
				$custom_bp,
				$scoped_class,
				$rules_str
			);
		}

		// Toggle ON = disable below breakpoint: output margin via <style> tag
		// so the @media reset (same specificity) can override it.
		if ( ! empty( $custom_margin_declarations ) && $custom_margin_mobile_only ) {
			$bp = $has_custom_bp ? $custom_bp : (int) $this->get_mobile_breakpoint();

			// Margin as stylesheet rule (not inline) so the reset can win.
			$inline_style .= sprintf(
				'<style>.%s{%s}</style>',
				$scoped_class,
				implode( ';', $custom_margin_declarations )
			);

			$reset_rules = array();
			foreach ( $sides as $side ) {
				if ( isset( $custom_margin[ $side ] ) && '' !== $custom_margin[ $side ] ) {
					$override_val  = isset( $custom_margin_override[ $side ] ) && '' !== $custom_margin_override[ $side ]
						? esc_attr( $custom_margin_override[ $side ] )
						: '0px';
					$reset_rules[] = "margin-{$side}:{$override_val} !important";
				}
			}
			$inline_style .= sprintf(
				'<style>@media(max-width:%dpx){.%s{%s}}</style>',
				$bp,
				$scoped_class,
				implode( ';', $reset_rules )
			);
		}

		$processor = new \WP_HTML_Tag_Processor( $block_content );

		if ( $processor->next_tag() ) {
			if ( ! empty( $classes ) ) {
				$existing = $processor->get_attribute( 'class' ) ?? '';
				$processor->set_attribute( 'class', trim( $existing . ' ' . implode( ' ', $classes ) ) );
			}

			// Only apply custom margin as inline style when toggle is OFF.
			if ( ! empty( $custom_margin_declarations ) && ! $custom_margin_mobile_only ) {
				$existing_style = $processor->get_attribute( 'style' ) ?? '';
				$new_style      = implode( ';', $custom_margin_declarations );
				$full_style     = $existing_style
					? rtrim( $existing_style, ';' ) . ';' . $new_style
					: $new_style;
				$processor->set_attribute( 'style', $full_style );
			}

			// Set the CSS variable for flex-basis (global breakpoint path).
			if ( $flex_basis && ! $has_custom_bp ) {
				$existing_style = $processor->get_attribute( 'style' ) ?? '';
				$var_decl       = '--ml-mobile-flex-basis:' . esc_attr( $flex_basis );
				$full_style     = $existing_style
					? rtrim( $existing_style, ';' ) . ';' . $var_decl
					: $var_decl;
				$processor->set_attribute( 'style', $full_style );
			}

			// Apply min-width as inline style.
			if ( $custom_min_width ) {
				$existing_style = $processor->get_attribute( 'style' ) ?? '';
				$min_w_decl     = 'min-width:' . esc_attr( $custom_min_width ) . ' !important';
				$full_style     = $existing_style
					? rtrim( $existing_style, ';' ) . ';' . $min_w_decl
					: $min_w_decl;
				$processor->set_attribute( 'style', $full_style );
			}

			// Hide the block on the frontend.
			if ( $is_hidden ) {
				$existing_style = $processor->get_attribute( 'style' ) ?? '';
				$hidden_decl    = 'display:none';
				$full_style     = $existing_style
					? rtrim( $existing_style, ';' ) . ';' . $hidden_decl
					: $hidden_decl;
				$processor->set_attribute( 'style', $full_style );
			}

			// Attach scroll-behavior configuration as a data attribute.
			if ( $has_scroll ) {
				$allowed_animations = array( 'fade', 'slide', 'none' );
				$allowed_modes      = array( 'offset', 'direction' );
				$allowed_dirs       = array( 'down', 'up' );

				$scroll_data = array(
					'enabled'         => true,
					'mode'            => in_array( $scroll_behavior['mode'] ?? '', $allowed_modes, true )
						? $scroll_behavior['mode']
						: 'offset',
					'offset'          => max( 0, (int) ( $scroll_behavior['offset'] ?? 100 ) ),
					'hideOnExceed'    => isset( $scroll_behavior['hideOnExceed'] )
						? (bool) $scroll_behavior['hideOnExceed']
						: true,
					'animation'       => in_array( $scroll_behavior['animation'] ?? '', $allowed_animations, true )
						? $scroll_behavior['animation']
						: 'fade',
					'enableOnMobile'  => isset( $scroll_behavior['enableOnMobile'] )
						? (bool) $scroll_behavior['enableOnMobile']
						: true,
					'enableOnDesktop' => isset( $scroll_behavior['enableOnDesktop'] )
						? (bool) $scroll_behavior['enableOnDesktop']
						: true,
					'directionHideOn' => in_array( $scroll_behavior['directionHideOn'] ?? '', $allowed_dirs, true )
						? $scroll_behavior['directionHideOn']
						: 'down',
				);

				$processor->set_attribute( 'data-ml-scroll', wp_json_encode( $scroll_data ) );
			}
		}

		$html = $inline_style . $processor->get_updated_html();

		// Add a stretched-link overlay when a link URL is set.
		// We inject an empty <a> inside the block instead of converting the
		// outer <div> to <a>, because nested <a> tags (inner links, buttons)
		// are invalid HTML and cause browsers to break the DOM tree.
		if ( $link_url ) {
			$safe_url = esc_url( $link_url );
			$target   = $link_target ? ' target="' . esc_attr( $link_target ) . '"' : '';
			$rel      = '_blank' === $link_target ? ' rel="noopener noreferrer"' : '';

			$link_el = sprintf(
				'<a class="ml-block-link" href="%s"%s%s aria-hidden="true" tabindex="-1"></a>',
				$safe_url,
				$target,
				$rel
			);

			// Insert the stretched link element right after the first opening tag.
			$html = preg_replace( '/^(\s*<[^>]+>)/s', '$1' . $link_el, $html, 1 );

			// Add the helper class to the wrapper.
			$proc2 = new \WP_HTML_Tag_Processor( $html );
			if ( $proc2->next_tag() ) {
				$existing_cls = $proc2->get_attribute( 'class' ) ?? '';
				$proc2->set_attribute( 'class', trim( $existing_cls . ' ml-has-link' ) );
			}
			$html = $proc2->get_updated_html();
		}

		return $html;
	}

	/**
	 * Slider ranges for mlTransform3d values: array( min, max, default ).
	 * Mirrored in src/utils/transform3d.js — keep both in sync.
	 */
	private const TRANSFORM_3D_RANGES = array(
		'perspective' => array( 0, 3000, 1000 ),
		'rotateX'     => array( -180, 180, 0 ),
		'rotateY'     => array( -180, 180, 0 ),
		'rotateZ'     => array( -180, 180, 0 ),
		'scale'       => array( 0, 3, 1 ),
	);

	/**
	 * Translate units and their ranges: array( min, max ). CSS only allows a
	 * percentage on translate X and Y; translateZ takes lengths.
	 * Mirrored in src/utils/transform3d.js — keep both in sync.
	 */
	private const TRANSFORM_3D_TRANSLATE_UNITS = array(
		'px'  => array( -2000, 2000 ),
		'%'   => array( -500, 500 ),
		'em'  => array( -100, 100 ),
		'rem' => array( -100, 100 ),
		'vw'  => array( -100, 100 ),
		'vh'  => array( -100, 100 ),
	);

	/**
	 * Allowed transform-origin values (the AlignmentMatrixControl cells).
	 */
	private const TRANSFORM_3D_ORIGINS = array(
		'top left',
		'top center',
		'top right',
		'center left',
		'center center',
		'center right',
		'bottom left',
		'bottom center',
		'bottom right',
	);

	/**
	 * Tags some blocks print before their wrapper (inline CSS, JSON-LD, …).
	 * The transform goes on the first tag that is not one of these.
	 */
	private const TRANSFORM_3D_SKIPPED_TAGS = array( 'STYLE', 'SCRIPT', 'LINK', 'META' );

	/**
	 * Register the mlTransform3d attribute server-side on every block.
	 *
	 * Without this, blocks previewed through ServerSideRender (Archives,
	 * RSS, Term Image, …) fail REST validation on the unknown attribute.
	 *
	 * @param array $args Block type registration arguments.
	 * @return array Arguments with the mlTransform3d attribute added.
	 */
	public function register_transform_3d_attribute( array $args ): array {
		$args['attributes']                  = is_array( $args['attributes'] ?? null ) ? $args['attributes'] : array();
		$args['attributes']['mlTransform3d'] = array( 'type' => 'object' );

		return $args;
	}

	/**
	 * Apply the 3D transform to the block's root element.
	 *
	 * Outputs CSS custom properties plus a helper class instead of an inline
	 * `transform`, so the frontend stylesheet owns the property. The scroll
	 * behavior "slide" animation writes and then clears el.style.transform,
	 * which would otherwise wipe an inline transform.
	 *
	 * @param string $block_content The block's rendered HTML.
	 * @param array  $block         The parsed block data.
	 * @return string Modified block HTML.
	 */
	public function apply_transform_3d( string $block_content, array $block ): string {
		$transform = $block['attrs']['mlTransform3d'] ?? null;

		if ( ! is_array( $transform ) ) {
			return $block_content;
		}

		$value = $this->get_transform_3d_value( $transform );

		if ( '' === $value ) {
			return $block_content;
		}

		$processor = new \WP_HTML_Tag_Processor( $block_content );

		do {
			if ( ! $processor->next_tag() ) {
				return $block_content;
			}
		} while ( in_array( $processor->get_tag(), self::TRANSFORM_3D_SKIPPED_TAGS, true ) );

		$origin = in_array( $transform['origin'] ?? '', self::TRANSFORM_3D_ORIGINS, true )
			? $transform['origin']
			: 'center center';

		$classes = 'ml-has-3d-transform';
		if ( ! empty( $transform['disableOnMobile'] ) ) {
			$classes .= ' ml-3d-desktop-only';
		}

		$existing_class = $processor->get_attribute( 'class' ) ?? '';
		$processor->set_attribute( 'class', trim( $existing_class . ' ' . $classes ) );

		// Always output both variables so a nested transformed block never
		// inherits its parent's origin.
		$existing_style = $processor->get_attribute( 'style' ) ?? '';
		$decl           = '--ml-3d-transform:' . $value . ';--ml-3d-origin:' . $origin;
		$full_style     = $existing_style
			? rtrim( $existing_style, ';' ) . ';' . $decl
			: $decl;
		$processor->set_attribute( 'style', $full_style );

		return $processor->get_updated_html();
	}

	/**
	 * Build the CSS transform value from mlTransform3d values.
	 *
	 * Mirrors getTransform3dValue() in src/utils/transform3d.js. Returns an
	 * empty string when the values would not move the element (perspective
	 * alone does nothing without a transform to apply it to).
	 *
	 * @param array $transform The mlTransform3d attribute.
	 * @return string CSS transform value.
	 */
	private function get_transform_3d_value( array $transform ): string {
		$v = array();

		foreach ( self::TRANSFORM_3D_RANGES as $key => list( $min, $max, $default ) ) {
			$raw       = $transform[ $key ] ?? null;
			$v[ $key ] = is_numeric( $raw ) && is_finite( (float) $raw )
				? round( max( $min, min( $max, (float) $raw ) ), 2 )
				: (float) $default;
		}

		// sprintf's %F ignores the locale; before PHP 8 a float cast to string
		// follows LC_NUMERIC, which prints "1,5" under e.g. nl_NL.
		$fmt = static function ( float $n ): string {
			$s = rtrim( rtrim( sprintf( '%.2F', $n ), '0' ), '.' );
			return '-0' === $s ? '0' : $s;
		};
		$css = array_map( $fmt, $v );

		$functions = array();
		$translate = array();
		$has_move  = false;

		foreach ( array( 'translateX', 'translateY', 'translateZ' ) as $axis ) {
			list( $quantity, $unit ) = $this->parse_translate_3d( $transform[ $axis ] ?? null, $axis );

			$translate[] = $fmt( $quantity ) . $unit;
			$has_move    = $has_move || 0.0 !== $quantity;
		}

		if ( $has_move ) {
			$functions[] = 'translate3d(' . implode( ', ', $translate ) . ')';
		}

		foreach ( array( 'rotateX', 'rotateY', 'rotateZ' ) as $axis ) {
			if ( 0.0 !== $v[ $axis ] ) {
				$functions[] = "{$axis}({$css[ $axis ]}deg)";
			}
		}

		if ( 1.0 !== $v['scale'] ) {
			$functions[] = "scale({$css['scale']})";
		}

		if ( empty( $functions ) ) {
			return '';
		}

		if ( $v['perspective'] > 0 ) {
			array_unshift( $functions, "perspective({$css['perspective']}px)" );
		}

		return implode( ' ', $functions );
	}

	/**
	 * Parse a stored translate value ("50%", "-2em", or a plain number in px)
	 * into array( quantity, unit ), clamped to the unit's range.
	 *
	 * Mirrors parseTranslate() in src/utils/transform3d.js. Invalid values
	 * and units the axis does not allow become 0px.
	 *
	 * @param mixed  $raw  Stored value.
	 * @param string $axis translateX, translateY or translateZ.
	 * @return array{0: float, 1: string} Quantity and unit.
	 */
	private function parse_translate_3d( $raw, string $axis ): array {
		$quantity = null;
		$unit     = 'px';

		if ( is_int( $raw ) || is_float( $raw ) ) {
			$quantity = (float) $raw;
		} elseif ( is_string( $raw ) && preg_match( '/^(-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)([a-z%]*)$/i', trim( $raw ), $m ) ) {
			$quantity = (float) $m[1];
			$unit     = '' === $m[2] ? 'px' : strtolower( $m[2] );
		}

		$allowed = isset( self::TRANSFORM_3D_TRANSLATE_UNITS[ $unit ] ) && ! ( 'translateZ' === $axis && '%' === $unit );

		if ( null === $quantity || ! is_finite( $quantity ) || ! $allowed ) {
			return array( 0.0, 'px' );
		}

		list( $min, $max ) = self::TRANSFORM_3D_TRANSLATE_UNITS[ $unit ];

		return array( round( max( $min, min( $max, $quantity ) ), 2 ), $unit );
	}

	/**
	 * Build the stylesheet that maps the --ml-3d-* variables to a transform
	 * and resets desktop-only transforms below the mobile breakpoint.
	 *
	 * @param string $selector  Selector matching transformed elements.
	 * @param string $important Either '' or ' !important'.
	 * @return string CSS rules.
	 */
	private function get_transform_3d_css( string $selector, string $important ): string {
		return sprintf(
			'%1$s{transform:var(--ml-3d-transform)%2$s;transform-origin:var(--ml-3d-origin)%2$s}'
			. '@media(max-width:%3$s){%1$s.ml-3d-desktop-only{transform:none%2$s}}',
			$selector,
			$important,
			esc_attr( $this->get_mobile_breakpoint() )
		);
	}

	/**
	 * Enqueue the frontend stylesheet that applies 3D transforms.
	 *
	 * Frontend only: ServerSideRender previews in the editor also carry the
	 * class, and would be transformed a second time inside their wrapper.
	 */
	public function enqueue_transform_3d_styles(): void {
		wp_register_style( 'ml-gutenberg-3d-transform', false, array(), '1.0' );
		wp_enqueue_style( 'ml-gutenberg-3d-transform' );
		wp_add_inline_style(
			'ml-gutenberg-3d-transform',
			$this->get_transform_3d_css( '.ml-has-3d-transform', '' )
		);
	}

	/**
	 * Enqueue the editor stylesheet for the 3D transform live preview.
	 *
	 * The editor puts the frontend class and variables on the block wrapper
	 * (editor.BlockListBlock wrapperProps). Scoping to [data-block] leaves
	 * ServerSideRender output inside the wrapper alone; !important matches
	 * the other editor preview rules.
	 */
	public function enqueue_transform_3d_editor_styles(): void {
		if ( ! is_admin() ) {
			return;
		}

		wp_register_style( 'ml-gutenberg-3d-transform-editor', false, array(), '1.0' );
		wp_enqueue_style( 'ml-gutenberg-3d-transform-editor' );
		wp_add_inline_style(
			'ml-gutenberg-3d-transform-editor',
			$this->get_transform_3d_css( '[data-block].ml-has-3d-transform', ' !important' )
		);
	}

	/**
	 * Reveal effects and what "amount" means for each: array( min, max, default ).
	 * Mirrored in src/utils/scroll-effects.js — keep both in sync.
	 */
	private const REVEAL_AMOUNTS = array(
		'fade'         => array( 0, 600, 40 ),
		'slide-bottom' => array( 0, 600, 40 ),
		'slide-top'    => array( 0, 600, 40 ),
		'slide-left'   => array( 0, 600, 40 ),
		'slide-right'  => array( 0, 600, 40 ),
		'zoom-in'      => array( 0, 1, 0.2 ),
		'zoom-out'     => array( 0, 1, 0.2 ),
		'flip-x'       => array( 0, 180, 60 ),
		'flip-y'       => array( 0, 180, 60 ),
		'rotate'       => array( -180, 180, 15 ),
		'blur'         => array( 0, 50, 8 ),
		'wipe'         => array( 0, 600, 40 ),
	);

	/**
	 * Easing curves the frontend engine knows.
	 */
	private const REVEAL_EASINGS = array( 'linear', 'ease-out', 'ease-in-out', 'back-out' );

	/**
	 * Scroll-linked amplitudes: array( min, max, default ).
	 */
	private const SCROLL_FX_RANGES = array(
		'rotateX'     => array( -180, 180, 0 ),
		'rotateY'     => array( -180, 180, 0 ),
		'rotateZ'     => array( -180, 180, 0 ),
		'translateX'  => array( -1000, 1000, 0 ),
		'translateY'  => array( -1000, 1000, 0 ),
		'scale'       => array( -1, 1, 0 ),
		'opacity'     => array( 0, 1, 0 ),
		'blur'        => array( 0, 50, 0 ),
		'perspective' => array( 0, 3000, 1000 ),
		'startOffset' => array( -100, 100, 0 ),
		'endOffset'   => array( -100, 100, 0 ),
		'smoothing'   => array( 0, 0.95, 0.15 ),
	);

	/**
	 * Register the scroll animation attributes server-side on every block, so
	 * ServerSideRender previews accept them.
	 *
	 * @param array $args Block type registration arguments.
	 * @return array Arguments with both attributes added.
	 */
	public function register_scroll_animation_attributes( array $args ): array {
		$args['attributes'] = is_array( $args['attributes'] ?? null ) ? $args['attributes'] : array();

		$args['attributes']['mlScrollReveal'] = array( 'type' => 'object' );
		$args['attributes']['mlScrollFx']     = array( 'type' => 'object' );

		return $args;
	}

	/**
	 * Clamp a stored number and keep whole values integral, so the JSON the
	 * frontend reads carries 40 rather than 40.0.
	 *
	 * @param mixed $raw     Stored value.
	 * @param float $min     Lowest allowed value.
	 * @param float $max     Highest allowed value.
	 * @param float $fallback Value to use when $raw is not a number.
	 * @return int|float Clamped number.
	 */
	private function clamp_number( $raw, float $min, float $max, float $fallback ) {
		$value = is_numeric( $raw ) && is_finite( (float) $raw ) ? (float) $raw : $fallback;
		$value = round( max( $min, min( $max, $value ) ), 2 );

		return (float) (int) $value === $value ? (int) $value : $value;
	}

	/**
	 * Sanitize the mlScrollReveal attribute.
	 *
	 * Mirrors normalizeReveal() in src/utils/scroll-effects.js.
	 *
	 * @param array $raw Stored attribute.
	 * @return array Settings for the frontend engine.
	 */
	private function normalize_reveal( array $raw ): array {
		$effect                       = isset( $raw['effect'] ) && isset( self::REVEAL_AMOUNTS[ $raw['effect'] ] ) ? $raw['effect'] : 'fade';
		list( $min, $max, $fallback ) = self::REVEAL_AMOUNTS[ $effect ];

		return array(
			'enabled'   => ! empty( $raw['enabled'] ),
			'effect'    => $effect,
			'amount'    => $this->clamp_number( $raw['amount'] ?? null, (float) $min, (float) $max, (float) $fallback ),
			'duration'  => (int) $this->clamp_number( $raw['duration'] ?? null, 0, 5000, 600 ),
			'delay'     => (int) $this->clamp_number( $raw['delay'] ?? null, 0, 5000, 0 ),
			'easing'    => in_array( $raw['easing'] ?? '', self::REVEAL_EASINGS, true ) ? $raw['easing'] : 'ease-out',
			'threshold' => $this->clamp_number( $raw['threshold'] ?? null, 0, 1, 0.15 ),
			'offset'    => (int) $this->clamp_number( $raw['offset'] ?? null, -100, 100, 0 ),
			'once'      => ! isset( $raw['once'] ) || ! empty( $raw['once'] ),
			'fade'      => ! isset( $raw['fade'] ) || ! empty( $raw['fade'] ),
			'stagger'   => (int) $this->clamp_number( $raw['stagger'] ?? null, 0, 1000, 0 ),
		);
	}

	/**
	 * Sanitize the mlScrollFx attribute.
	 *
	 * Mirrors normalizeScrollFx() in src/utils/scroll-effects.js.
	 *
	 * @param array $raw Stored attribute.
	 * @return array Settings for the frontend engine.
	 */
	private function normalize_scroll_fx( array $raw ): array {
		$settings = array( 'enabled' => ! empty( $raw['enabled'] ) );

		foreach ( self::SCROLL_FX_RANGES as $key => $range ) {
			list( $min, $max, $fallback ) = $range;

			$settings[ $key ] = $this->clamp_number( $raw[ $key ] ?? null, (float) $min, (float) $max, (float) $fallback );
		}

		$settings['mode'] = in_array( $raw['mode'] ?? '', array( 'centered', 'progressive' ), true ) ? $raw['mode'] : 'centered';

		return $settings;
	}

	/**
	 * The visual state a revealing block starts from.
	 *
	 * Written as CSS custom properties so the start state is painted before
	 * the frontend script runs — no flash of un-animated content — while the
	 * engine takes over from there.
	 *
	 * Mirrors getRevealState( reveal, 0 ) in src/utils/scroll-effects.js.
	 *
	 * @param array $reveal Sanitized reveal settings.
	 * @return array{transform: string, opacity: int, filter: string, clip: string} Start state.
	 */
	private function get_reveal_start_state( array $reveal ): array {
		$amount      = (float) $reveal['amount'];
		$translate_x = 0.0;
		$translate_y = 0.0;
		$rotate_x    = 0.0;
		$rotate_y    = 0.0;
		$rotate_z    = 0.0;
		$scale       = 1.0;
		$blur        = 0.0;
		$clip        = -1.0;

		switch ( $reveal['effect'] ) {
			case 'slide-bottom':
				$translate_y = $amount;
				break;
			case 'slide-top':
				$translate_y = -$amount;
				break;
			case 'slide-left':
				$translate_x = -$amount;
				break;
			case 'slide-right':
				$translate_x = $amount;
				break;
			case 'zoom-in':
				$scale = 1 - $amount;
				break;
			case 'zoom-out':
				$scale = 1 + $amount;
				break;
			case 'flip-x':
				$rotate_x = $amount;
				break;
			case 'flip-y':
				$rotate_y = $amount;
				break;
			case 'rotate':
				$rotate_z = $amount;
				break;
			case 'blur':
				$blur = $amount;
				break;
			case 'wipe':
				$clip = 100.0;
				break;
		}

		$fmt   = static function ( float $n ): string {
			$s = rtrim( rtrim( sprintf( '%.2F', $n ), '0' ), '.' );
			return '-0' === $s ? '0' : $s;
		};
		$parts = array();

		if ( 0.0 !== $rotate_x || 0.0 !== $rotate_y ) {
			$parts[] = 'perspective(1000px)';
		}
		if ( 0.0 !== $translate_x || 0.0 !== $translate_y ) {
			$parts[] = 'translate3d(' . $fmt( $translate_x ) . 'px, ' . $fmt( $translate_y ) . 'px, 0px)';
		}
		if ( 0.0 !== $rotate_x ) {
			$parts[] = 'rotateX(' . $fmt( $rotate_x ) . 'deg)';
		}
		if ( 0.0 !== $rotate_y ) {
			$parts[] = 'rotateY(' . $fmt( $rotate_y ) . 'deg)';
		}
		if ( 0.0 !== $rotate_z ) {
			$parts[] = 'rotate(' . $fmt( $rotate_z ) . 'deg)';
		}
		if ( 1.0 !== $scale ) {
			$parts[] = 'scale(' . $fmt( $scale ) . ')';
		}

		return array(
			'transform' => implode( ' ', $parts ),
			'opacity'   => $reveal['fade'] ? 0 : 1,
			'filter'    => 0.0 !== $blur ? 'blur(' . $fmt( $blur ) . 'px)' : '',
			'clip'      => $clip >= 0 ? 'inset(0% 0% ' . $fmt( $clip ) . '% 0%)' : '',
		);
	}

	/**
	 * Hand the scroll animation settings to the frontend engine.
	 *
	 * Settings travel as data attributes; the reveal start state travels as
	 * CSS custom properties the stylesheet applies while the block waits.
	 *
	 * @param string $block_content The block's rendered HTML.
	 * @param array  $block         The parsed block data.
	 * @return string Modified block HTML.
	 */
	public function apply_scroll_animation( string $block_content, array $block ): string {
		$attrs      = $block['attrs'] ?? array();
		$raw_reveal = is_array( $attrs['mlScrollReveal'] ?? null ) ? $attrs['mlScrollReveal'] : array();
		$raw_fx     = is_array( $attrs['mlScrollFx'] ?? null ) ? $attrs['mlScrollFx'] : array();

		if ( empty( $raw_reveal['enabled'] ) && empty( $raw_fx['enabled'] ) ) {
			return $block_content;
		}

		$processor = new \WP_HTML_Tag_Processor( $block_content );

		do {
			if ( ! $processor->next_tag() ) {
				return $block_content;
			}
		} while ( in_array( $processor->get_tag(), self::TRANSFORM_3D_SKIPPED_TAGS, true ) );

		$classes      = array();
		$declarations = array();

		if ( ! empty( $raw_reveal['enabled'] ) ) {
			$reveal    = $this->normalize_reveal( $raw_reveal );
			$start     = $this->get_reveal_start_state( $reveal );
			$classes[] = 'ml-reveal';

			// With a stagger the children animate, so the stylesheet has to
			// hide them instead of the container.
			if ( $reveal['stagger'] > 0 ) {
				$classes[] = 'ml-reveal-stagger';
			}

			if ( '' !== $start['transform'] ) {
				$declarations[] = '--ml-reveal-from:' . $start['transform'];
			}

			$declarations[] = '--ml-reveal-opacity:' . $start['opacity'];

			if ( '' !== $start['filter'] ) {
				$declarations[] = '--ml-reveal-filter:' . $start['filter'];
			}

			if ( '' !== $start['clip'] ) {
				$declarations[] = '--ml-reveal-clip:' . $start['clip'];
			}

			$processor->set_attribute( 'data-ml-reveal', wp_json_encode( $reveal ) );
		}

		if ( ! empty( $raw_fx['enabled'] ) ) {
			$classes[] = 'ml-scroll-fx';
			$processor->set_attribute( 'data-ml-scroll-fx', wp_json_encode( $this->normalize_scroll_fx( $raw_fx ) ) );
		}

		$existing_class = $processor->get_attribute( 'class' ) ?? '';
		$processor->set_attribute( 'class', trim( $existing_class . ' ' . implode( ' ', $classes ) ) );

		if ( ! empty( $declarations ) ) {
			$existing_style = $processor->get_attribute( 'style' ) ?? '';
			$decl           = implode( ';', $declarations );
			$processor->set_attribute( 'style', $existing_style ? rtrim( $existing_style, ';' ) . ';' . $decl : $decl );
		}

		return $processor->get_updated_html();
	}

	/**
	 * Mark the document as script-capable.
	 *
	 * The stylesheet only hides a revealing block below this class, so the
	 * content stays visible when JavaScript never runs.
	 */
	public function print_scroll_ready_class(): void {
		wp_print_inline_script_tag(
			"document.documentElement.classList.add('ml-scroll-ready');",
			array( 'id' => 'ml-scroll-ready' )
		);
	}

	/**
	 * Enqueue the frontend scroll animation engine and its stylesheet.
	 */
	public function enqueue_scroll_animation_assets(): void {
		$asset_file = plugin_dir_path( __FILE__ ) . 'build/scroll-effects.asset.php';

		if ( ! file_exists( $asset_file ) ) {
			return;
		}

		$asset = include $asset_file;

		wp_enqueue_script(
			'ml-gutenberg-scroll-effects',
			plugin_dir_url( __FILE__ ) . 'build/scroll-effects.js',
			$asset['dependencies'],
			$asset['version'],
			true // Load in footer.
		);

		$css_file = plugin_dir_path( __FILE__ ) . 'build/scroll-effects.css';

		if ( file_exists( $css_file ) ) {
			wp_enqueue_style(
				'ml-gutenberg-scroll-effects',
				plugin_dir_url( __FILE__ ) . 'build/scroll-effects.css',
				array(),
				filemtime( $css_file )
			);
		}
	}

	/**
	 * Timing ranges for the cycling text: array( min, max, default ).
	 * Mirrored in src/utils/typewriter.js — keep both in sync.
	 */
	private const TYPEWRITER_TIMINGS = array(
		'interval'  => array( 200, 20000, 2500 ),
		'typeSpeed' => array( 5, 500, 60 ),
		'backSpeed' => array( 5, 500, 30 ),
	);

	/**
	 * Register the cycling-text attribute, which only makes sense on a
	 * paragraph.
	 *
	 * @param array  $args       Block type registration arguments.
	 * @param string $block_type Name of the block being registered.
	 * @return array Arguments, with the attribute added for paragraphs.
	 */
	public function register_typewriter_attribute( array $args, string $block_type ): array {
		if ( 'core/paragraph' !== $block_type ) {
			return $args;
		}

		$args['attributes'] = is_array( $args['attributes'] ?? null ) ? $args['attributes'] : array();

		$args['attributes']['mlTypewriter'] = array( 'type' => 'object' );

		return $args;
	}

	/**
	 * Sanitize the mlTypewriter attribute.
	 *
	 * Mirrors normalizeTypewriter() in src/utils/typewriter.js.
	 *
	 * @param array $raw Stored attribute.
	 * @return array Settings for the frontend script.
	 */
	private function normalize_typewriter( array $raw ): array {
		$texts = array();

		if ( isset( $raw['texts'] ) && is_array( $raw['texts'] ) ) {
			foreach ( $raw['texts'] as $text ) {
				if ( ! is_string( $text ) ) {
					continue;
				}

				$trimmed = trim( (string) preg_replace( '/\s+/u', ' ', $text ) );
				$trimmed = function_exists( 'mb_substr' ) ? mb_substr( $trimmed, 0, 200 ) : substr( $trimmed, 0, 200 );

				if ( '' !== $trimmed ) {
					$texts[] = $trimmed;
				}

				if ( count( $texts ) >= 20 ) {
					break;
				}
			}
		}

		$settings = array(
			'enabled' => ! empty( $raw['enabled'] ),
			'texts'   => $texts,
		);

		foreach ( self::TYPEWRITER_TIMINGS as $key => $range ) {
			list( $min, $max, $fallback ) = $range;

			$settings[ $key ] = (int) $this->clamp_number( $raw[ $key ] ?? null, (float) $min, (float) $max, (float) $fallback );
		}

		$settings['cursor'] = ! isset( $raw['cursor'] ) || ! empty( $raw['cursor'] );

		return $settings;
	}

	/**
	 * Hand a paragraph's extra texts to the frontend script.
	 *
	 * The paragraph keeps its own text in the markup — that is the first line
	 * of the cycle, and what search engines and visitors without JavaScript
	 * see — so at least one more text is needed before anything rotates.
	 *
	 * @param string $block_content The block's rendered HTML.
	 * @param array  $block         The parsed block data.
	 * @return string Modified block HTML.
	 */
	public function apply_typewriter( string $block_content, array $block ): string {
		$raw = is_array( $block['attrs']['mlTypewriter'] ?? null ) ? $block['attrs']['mlTypewriter'] : array();

		if ( empty( $raw['enabled'] ) ) {
			return $block_content;
		}

		$settings = $this->normalize_typewriter( $raw );

		if ( empty( $settings['texts'] ) ) {
			return $block_content;
		}

		$processor = new \WP_HTML_Tag_Processor( $block_content );

		do {
			if ( ! $processor->next_tag() ) {
				return $block_content;
			}
		} while ( in_array( $processor->get_tag(), self::TRANSFORM_3D_SKIPPED_TAGS, true ) );

		$existing_class = $processor->get_attribute( 'class' ) ?? '';

		$processor->set_attribute( 'class', trim( $existing_class . ' ml-typewriter' ) );
		$processor->set_attribute( 'data-ml-typewriter', wp_json_encode( $settings ) );

		return $processor->get_updated_html();
	}

	/**
	 * Enqueue the frontend script that types the texts.
	 */
	public function enqueue_typewriter_assets(): void {
		$asset_file = plugin_dir_path( __FILE__ ) . 'build/typewriter.asset.php';

		if ( ! file_exists( $asset_file ) ) {
			return;
		}

		$asset = include $asset_file;

		wp_enqueue_script(
			'ml-gutenberg-typewriter',
			plugin_dir_url( __FILE__ ) . 'build/typewriter.js',
			$asset['dependencies'],
			$asset['version'],
			true // Load in footer.
		);
	}

	/**
	 * Enqueue the blinking cursor styles.
	 */
	public function enqueue_typewriter_styles(): void {
		wp_register_style( 'ml-gutenberg-typewriter', false, array(), '1.0' );
		wp_enqueue_style( 'ml-gutenberg-typewriter' );
		wp_add_inline_style(
			'ml-gutenberg-typewriter',
			'.ml-typewriter-cursor{display:inline-block;width:2px;height:1em;vertical-align:-0.1em;margin-left:.08em;background:currentColor;animation:ml-typewriter-blink 1.05s steps(2,start) infinite}'
			. '@keyframes ml-typewriter-blink{to{visibility:hidden}}'
			. '@media(prefers-reduced-motion:reduce){.ml-typewriter-cursor{animation:none}}'
		);
	}

	/**
	 * Map mlCoverVerticalAlign values to CSS justify-content values.
	 */
	private const COVER_ALIGN_MAP = array(
		'top'    => 'flex-start',
		'center' => 'center',
		'bottom' => 'flex-end',
	);

	/**
	 * Apply vertical content alignment to core/cover blocks.
	 *
	 * Adds justify-content to the .wp-block-cover__inner-container element.
	 *
	 * @param string $block_content The block's rendered HTML.
	 * @param array  $block         The parsed block data.
	 * @return string Modified block HTML.
	 */
	public function apply_cover_vertical_align( string $block_content, array $block ): string {
		$align = $block['attrs']['mlCoverVerticalAlign'] ?? '';

		if ( empty( $align ) || ! isset( self::COVER_ALIGN_MAP[ $align ] ) ) {
			return $block_content;
		}

		$justify   = self::COVER_ALIGN_MAP[ $align ];
		$processor = new \WP_HTML_Tag_Processor( $block_content );

		// Find the inner container div.
		while ( $processor->next_tag() ) {
			$cls = $processor->get_attribute( 'class' ) ?? '';
			if ( false !== strpos( $cls, 'wp-block-cover__inner-container' ) ) {
				$existing_style = $processor->get_attribute( 'style' ) ?? '';
				$decl           = 'display:flex;flex-direction:column;height:100%;justify-content:' . $justify . ';align-self:' . $justify;
				$full_style     = $existing_style
					? rtrim( $existing_style, ';' ) . ';' . $decl
					: $decl;
				$processor->set_attribute( 'style', $full_style );
				break;
			}
		}

		return $processor->get_updated_html();
	}

	/**
	 * Fallback link injection for inner blocks of third-party parent
	 * blocks that bypass render_block() for their children.
	 *
	 * When a parent block is rendered through render_block(), its
	 * $block['innerBlocks'] still carry the full parsed attribute data.
	 * We walk the tree to find supported blocks with link settings whose
	 * HTML hasn't been processed yet, then inject the overlay link.
	 *
	 * @param string $block_content The parent block's rendered HTML.
	 * @param array  $block         The parsed parent block data.
	 * @return string Modified HTML with link overlays.
	 */
	public function process_parent_block_links( string $block_content, array $block ): string {
		// Blocks we handle individually already get their own render_block_{name} filter.
		if ( in_array( $block['blockName'] ?? '', self::SUPPORTED_BLOCKS, true ) ) {
			return $block_content;
		}

		if ( empty( $block['innerBlocks'] ) ) {
			return $block_content;
		}

		$link_configs = array();
		$this->collect_link_configs( $block['innerBlocks'], $link_configs );

		if ( empty( $link_configs ) ) {
			return $block_content;
		}

		foreach ( $link_configs as $config ) {
			$block_content = $this->inject_inner_block_links( $block_content, $config );
		}

		return $block_content;
	}

	/**
	 * Recursively walk inner blocks to find supported ones with link settings.
	 *
	 * @param array $inner_blocks The inner blocks to walk.
	 * @param array &$configs     Collected link configurations.
	 */
	private function collect_link_configs( array $inner_blocks, array &$configs ): void {
		foreach ( $inner_blocks as $inner_block ) {
			$block_name = $inner_block['blockName'] ?? '';
			$attrs      = $inner_block['attrs'] ?? array();

			if ( in_array( $block_name, self::SUPPORTED_BLOCKS, true ) ) {
				$link_url  = isset( $attrs['mlLinkUrl'] ) && '' !== $attrs['mlLinkUrl'] ? $attrs['mlLinkUrl'] : '';
				$link_type = isset( $attrs['mlLinkType'] ) && '' !== $attrs['mlLinkType'] ? $attrs['mlLinkType'] : '';

				if ( $link_url || $link_type ) {
					// Map core/group → wp-block-group, core/column → wp-block-column, etc.
					$css_class = str_replace( '/', '-', str_replace( 'core/', 'wp-block-', $block_name ) );

					$configs[] = array(
						'css_class'   => $css_class,
						'link_url'    => $link_url,
						'link_type'   => $link_type,
						'link_target' => isset( $attrs['mlLinkTarget'] ) && '' !== $attrs['mlLinkTarget'] ? $attrs['mlLinkTarget'] : '',
					);
				}
			}

			if ( ! empty( $inner_block['innerBlocks'] ) ) {
				$this->collect_link_configs( $inner_block['innerBlocks'], $configs );
			}
		}
	}

	/**
	 * Inject link overlays into HTML elements matching a CSS class.
	 *
	 * Splits the HTML at each matching opening tag, then injects the
	 * stretched-link <a> and the ml-has-link helper class.  For dynamic
	 * link types ("term" / "post") where WordPress context isn't available
	 * (e.g. inside a third-party terms query), falls back to extracting
	 * the href of the first inner <a> in each block instance.
	 *
	 * @param string $html   The parent block's HTML content.
	 * @param array  $config Link configuration from collect_link_configs().
	 * @return string Modified HTML.
	 */
	private function inject_inner_block_links( string $html, array $config ): string {
		$css_class   = preg_quote( $config['css_class'], '/' );
		$static_url  = $config['link_url'];
		$link_type   = $config['link_type'];
		$link_target = $config['link_target'];
		$target_attr = $link_target ? ' target="' . esc_attr( $link_target ) . '"' : '';
		$rel_attr    = '_blank' === $link_target ? ' rel="noopener noreferrer"' : '';

		// Split at each opening tag whose class contains the target CSS class.
		$pattern = '/(<[a-z][a-z0-9]*\s[^>]*class="[^"]*\b' . $css_class . '\b[^"]*"[^>]*>)/si';
		$parts   = preg_split( $pattern, $html, -1, PREG_SPLIT_DELIM_CAPTURE );

		if ( count( $parts ) <= 1 ) {
			return $html;
		}

		$result = $parts[0];

		for ( $i = 1, $len = count( $parts ); $i < $len; $i += 2 ) {
			$tag   = $parts[ $i ];
			$after = isset( $parts[ $i + 1 ] ) ? $parts[ $i + 1 ] : '';

			// Already processed — skip.
			if ( false !== strpos( $tag, 'ml-has-link' ) ) {
				$result .= $tag . $after;
				continue;
			}

			// Determine the URL.
			$url = $static_url;

			if ( empty( $url ) && $link_type ) {
				// Look ahead for the first <a href="..."> after this opening tag.
				if ( preg_match( '/<a\s[^>]*href="([^"]*)"/', $after, $m ) ) {
					$url = $m[1];
				}
			}

			if ( empty( $url ) ) {
				$result .= $tag . $after;
				continue;
			}

			// Add ml-has-link class to the opening tag.
			$tag = preg_replace( '/class="([^"]*)"/', 'class="$1 ml-has-link"', $tag, 1 );

			// Build the link overlay element.
			$link_el = sprintf(
				'<a class="ml-block-link" href="%s"%s%s aria-hidden="true" tabindex="-1"></a>',
				esc_url( $url ),
				$target_attr,
				$rel_attr
			);

			$result .= $tag . $link_el . $after;
		}

		return $result;
	}

	/**
	 * Register the dynamic term image block.
	 */
	public function register_term_image_block(): void {
		register_block_type(
			'ml/term-image',
			array(
				'api_version'     => 2,
				'render_callback' => array( $this, 'render_term_image_block' ),
				'attributes'      => array(
					'taxonomy'         => array(
						'type'    => 'string',
						'default' => 'category',
					),
					'imageSize'        => array(
						'type'    => 'string',
						'default' => 'medium',
					),
					'linkToTerm'       => array(
						'type'    => 'boolean',
						'default' => false,
					),
					'aspectRatio'      => array(
						'type'    => 'string',
						'default' => 'auto',
					),
					'scale'            => array(
						'type'    => 'string',
						'default' => 'cover',
					),
					'fallbackImageId'  => array(
						'type'    => 'number',
						'default' => 0,
					),
					'fallbackImageUrl' => array(
						'type'    => 'string',
						'default' => '',
					),
				),
				'supports'        => array(
					'html'  => false,
					'align' => array( 'left', 'center', 'right', 'wide', 'full' ),
				),
			)
		);
	}

	/**
	 * Render callback for the term image block.
	 *
	 * @param array     $attributes Block attributes.
	 * @param string    $content    Block content.
	 * @param \WP_Block $block      Parsed block instance.
	 * @return string Rendered HTML.
	 */
	public function render_term_image_block( array $attributes, string $content, \WP_Block $block ): string {
		unset( $content );

		$aspect_ratio = isset( $attributes['aspectRatio'] ) && is_string( $attributes['aspectRatio'] )
			? trim( $attributes['aspectRatio'] )
			: 'auto';

		if ( 'auto' !== $aspect_ratio && ! preg_match( '/^\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?$/', $aspect_ratio ) ) {
			$aspect_ratio = 'auto';
		}

		$scale = isset( $attributes['scale'] ) && is_string( $attributes['scale'] )
			? sanitize_key( $attributes['scale'] )
			: 'cover';

		if ( ! in_array( $scale, array( 'cover', 'contain', 'fill', 'none', 'scale-down' ), true ) ) {
			$scale = 'cover';
		}

		$image_style_parts = array();
		if ( 'auto' !== $aspect_ratio ) {
			$image_style_parts[] = 'width:100%';
			$image_style_parts[] = 'height:100%';
		}
		$image_style_parts[] = 'object-fit:' . $scale;

		$image_style = implode( ';', $image_style_parts );

		$wrapper_style = '';
		if ( 'auto' !== $aspect_ratio ) {
			$wrapper_style = 'aspect-ratio:' . $aspect_ratio;
		}

		$image_size = isset( $attributes['imageSize'] ) && is_string( $attributes['imageSize'] )
			? sanitize_key( $attributes['imageSize'] )
			: 'medium';

		$fallback_image_id  = isset( $attributes['fallbackImageId'] ) ? absint( $attributes['fallbackImageId'] ) : 0;
		$fallback_image_url = isset( $attributes['fallbackImageUrl'] ) && is_string( $attributes['fallbackImageUrl'] )
			? esc_url_raw( $attributes['fallbackImageUrl'] )
			: '';

		$taxonomy = isset( $attributes['taxonomy'] ) && is_string( $attributes['taxonomy'] )
			? sanitize_key( $attributes['taxonomy'] )
			: 'category';

		if ( ! taxonomy_exists( $taxonomy ) ) {
			$taxonomy = 'category';
		}

		$term = null;

		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- Read-only term context for editor SSR preview.
		$request_term_id       = isset( $_REQUEST['ml_term_id'] ) ? absint( wp_unslash( $_REQUEST['ml_term_id'] ) ) : 0;
		$request_term_taxonomy = isset( $_REQUEST['ml_term_taxonomy'] ) ? sanitize_key( wp_unslash( $_REQUEST['ml_term_taxonomy'] ) ) : '';
		// phpcs:enable WordPress.Security.NonceVerification.Recommended

		if ( $request_term_id ) {
			$term_candidate = $request_term_taxonomy
				? get_term( $request_term_id, $request_term_taxonomy )
				: get_term( $request_term_id );

			if ( $term_candidate instanceof \WP_Term ) {
				$term = $term_candidate;
			}
		}

		foreach ( array( 'termId', 'term_id', 'queriedTermId' ) as $term_context_key ) {
			if ( $term ) {
				break;
			}

			if ( isset( $block->context[ $term_context_key ] ) ) {
				$term_id = absint( $block->context[ $term_context_key ] );
				if ( $term_id ) {
					$term_candidate = get_term( $term_id );
					if ( $term_candidate instanceof \WP_Term ) {
						$term = $term_candidate;
						break;
					}
				}
			}
		}

		if ( ! $term ) {
			$post_id = 0;

			if ( isset( $block->context['postId'] ) ) {
				$post_id = absint( $block->context['postId'] );
			}

			if ( ! $post_id ) {
				$post_id = get_the_ID() ? absint( get_the_ID() ) : 0;
			}

			if ( $post_id ) {
				$terms = get_the_terms( $post_id, $taxonomy );
				if ( ! empty( $terms ) && ! is_wp_error( $terms ) ) {
					$term_candidate = reset( $terms );
					if ( $term_candidate instanceof \WP_Term ) {
						$term = $term_candidate;
					}
				}
			}
		}

		$thumbnail_id = 0;
		if ( $term instanceof \WP_Term ) {
			$thumbnail_id = (int) get_term_meta( $term->term_id, 'thumbnail_id', true );
		}

		$image_html = '';
		$image_alt  = $term instanceof \WP_Term ? $term->name : '';

		if ( $thumbnail_id ) {
			$image_html = wp_get_attachment_image(
				$thumbnail_id,
				$image_size,
				false,
				array(
					'class' => 'wp-block-ml-term-image__image',
					'alt'   => $image_alt,
					'style' => $image_style,
				)
			);
		} elseif ( $fallback_image_id ) {
			$image_html = wp_get_attachment_image(
				$fallback_image_id,
				$image_size,
				false,
				array(
					'class' => 'wp-block-ml-term-image__image',
					'alt'   => $image_alt,
					'style' => $image_style,
				)
			);
		} elseif ( $fallback_image_url ) {
			$image_html = sprintf(
				'<img class="wp-block-ml-term-image__image" src="%1$s" alt="%2$s" style="%3$s" />',
				esc_url( $fallback_image_url ),
				esc_attr( $image_alt ),
				esc_attr( $image_style )
			);
		}

		if ( ! $image_html ) {
			return '';
		}

		if ( ! empty( $attributes['linkToTerm'] ) && $term instanceof \WP_Term ) {
			$term_link = get_term_link( $term );

			if ( ! is_wp_error( $term_link ) && is_string( $term_link ) ) {
				$image_html = sprintf(
					'<a class="wp-block-ml-term-image__link" href="%s">%s</a>',
					esc_url( $term_link ),
					$image_html
				);
			}
		}

		$wrapper_args = array(
			'class' => 'wp-block-ml-term-image',
		);

		if ( $wrapper_style ) {
			$wrapper_args['style'] = $wrapper_style;
		}

		$wrapper_attributes = get_block_wrapper_attributes( $wrapper_args );

		return sprintf( '<div %1$s>%2$s</div>', $wrapper_attributes, $image_html );
	}
}

new ML_Gutenberg_Customizations();
