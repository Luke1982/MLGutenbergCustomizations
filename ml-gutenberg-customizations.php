<?php
/**
 * Plugin Name: MajorLabel Gutenberg Customizations
 * Description: Custom margin and padding controls for mobile screens in the Gutenberg editor.
 * Version: 1.4.12
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

		foreach ( self::SUPPORTED_BLOCKS as $block ) {
			add_filter( "render_block_{$block}", array( $this, 'add_mobile_spacing_classes' ), 10, 2 );
		}

		// Fallback: catch inner blocks rendered by third-party plugins
		// (e.g. terms-query) that bypass render_block() for children.
		add_filter( 'render_block', array( $this, 'process_parent_block_links' ), 20, 2 );

		add_filter( 'render_block_core/cover', array( $this, 'apply_cover_vertical_align' ), 10, 2 );
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
	 * Inject mobile spacing classes into the rendered block markup.
	 *
	 * Uses WP_HTML_Tag_Processor (WP 6.2+) so the classes are added at
	 * render time — no block-validation errors if the plugin is removed.
	 *
	 * When a custom breakpoint is set on a block, inline CSS is output
	 * inside a scoped @media query targeting that specific element.
	 *
	 * @param string $block_content The block's rendered HTML.
	 * @param array  $block         The parsed block data.
	 * @return string Modified block HTML with mobile spacing classes.
	 */
	public function add_mobile_spacing_classes( string $block_content, array $block ): string {
		$attrs                     = $block['attrs'] ?? array();
		$padding                   = is_array( $attrs['mlMobilePadding'] ?? null ) ? $attrs['mlMobilePadding'] : array();
		$margin                    = is_array( $attrs['mlMobileMargin'] ?? null ) ? $attrs['mlMobileMargin'] : array();
		$custom_margin             = is_array( $attrs['mlCustomMargin'] ?? null ) ? $attrs['mlCustomMargin'] : array();
		$custom_margin_mobile_only = ! empty( $attrs['mlCustomMarginMobileOnly'] );
		$custom_margin_override    = is_array( $attrs['mlCustomMarginMobileOverride'] ?? null ) ? $attrs['mlCustomMarginMobileOverride'] : array();
		$flex_column               = ! empty( $attrs['mlMobileFlexColumn'] );
		$flex_basis                = isset( $attrs['mlMobileFlexBasis'] ) && '' !== $attrs['mlMobileFlexBasis']
			? $attrs['mlMobileFlexBasis']
			: '';
		$custom_min_width          = isset( $attrs['mlCustomMinWidth'] ) && '' !== $attrs['mlCustomMinWidth']
			? $attrs['mlCustomMinWidth']
			: '';
		$is_hidden                 = ! empty( $attrs['mlHidden'] );
		$link_url                  = isset( $attrs['mlLinkUrl'] ) && '' !== $attrs['mlLinkUrl']
			? $attrs['mlLinkUrl']
			: '';
		$link_target               = isset( $attrs['mlLinkTarget'] ) && '' !== $attrs['mlLinkTarget']
			? $attrs['mlLinkTarget']
			: '';
		$custom_bp                 = isset( $attrs['mlMobileBreakpoint'] ) ? absint( $attrs['mlMobileBreakpoint'] ) : 0;
		$has_custom_bp             = $custom_bp > 0;
		$sides                     = array( 'top', 'right', 'bottom', 'left' );
		$classes                   = array();
		$inline_rules              = array();

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

		if ( empty( $classes ) && empty( $inline_rules ) && empty( $custom_margin_declarations ) && empty( $flex_basis ) && empty( $custom_min_width ) && ! $is_hidden && empty( $link_url ) ) {
			return $block_content;
		}

		// Generate a unique scoped class when we need inline CSS.
		$inline_style = '';
		$scoped_class = '';

		if ( ! empty( $inline_rules ) || ( ! empty( $custom_margin_declarations ) && $custom_margin_mobile_only ) ) {
			$scoped_class = 'ml-mobile-' . substr( md5( wp_json_encode( $attrs ) . $block_content ), 0, 8 );
			$classes[]    = $scoped_class;
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
