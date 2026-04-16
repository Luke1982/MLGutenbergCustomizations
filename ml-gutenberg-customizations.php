<?php
/**
 * Plugin Name: MajorLabel Gutenberg Customizations
 * Description: Custom margin and padding controls for mobile screens in the Gutenberg editor.
 * Version: 1.1.0
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
		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_editor_assets' ) );
		add_action( 'enqueue_block_assets', array( $this, 'enqueue_block_assets' ) );

		foreach ( self::SUPPORTED_BLOCKS as $block ) {
			add_filter( "render_block_{$block}", array( $this, 'add_mobile_spacing_classes' ), 10, 2 );
		}
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

		if ( empty( $classes ) && empty( $inline_rules ) && empty( $custom_margin_declarations ) && empty( $flex_basis ) && empty( $custom_min_width ) && ! $is_hidden ) {
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

		$processor = new WP_HTML_Tag_Processor( $block_content );

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

		return $inline_style . $processor->get_updated_html();
	}
}

new ML_Gutenberg_Customizations();
