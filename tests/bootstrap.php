<?php

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ );
}

if ( ! function_exists( 'add_action' ) ) {
	function add_action( ...$args ): void {}
}

if ( ! function_exists( 'add_filter' ) ) {
	function add_filter( ...$args ): void {}
}

if ( ! function_exists( 'wp_get_global_settings' ) ) {
	function wp_get_global_settings( array $path = array() ): array {
		return array( 'contentSize' => '650px' );
	}
}

if ( ! function_exists( 'sanitize_key' ) ) {
	function sanitize_key( string $key ): string {
		$key = strtolower( $key );
		return preg_replace( '/[^a-z0-9_\-]/', '', $key ) ?? '';
	}
}

if ( ! function_exists( 'sanitize_html_class' ) ) {
	function sanitize_html_class( string $class ): string {
		return preg_replace( '/[^A-Za-z0-9_-]/', '', $class ) ?? '';
	}
}

if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( string $value ): string {
		return htmlspecialchars( $value, ENT_QUOTES, 'UTF-8' );
	}
}

if ( ! function_exists( 'esc_url' ) ) {
	function esc_url( string $url ): string {
		return $url;
	}
}

if ( ! function_exists( 'wp_json_encode' ) ) {
	function wp_json_encode( $value ): string {
		return (string) json_encode( $value );
	}
}

if ( ! function_exists( 'absint' ) ) {
	function absint( $maybeint ): int {
		return abs( (int) $maybeint );
	}
}

if ( ! function_exists( 'get_the_ID' ) ) {
	function get_the_ID(): int {
		return 0;
	}
}

if ( ! function_exists( 'get_permalink' ) ) {
	function get_permalink( int $post_id ): string {
		return 'https://example.com/post/' . $post_id;
	}
}

if ( ! function_exists( 'taxonomy_exists' ) ) {
	function taxonomy_exists( string $taxonomy ): bool {
		return false;
	}
}

if ( ! function_exists( 'get_term' ) ) {
	function get_term( int $term_id, string $taxonomy = '' ) {
		return null;
	}
}

if ( ! function_exists( 'get_the_terms' ) ) {
	function get_the_terms( int $post_id, string $taxonomy ) {
		return array();
	}
}

if ( ! function_exists( 'is_wp_error' ) ) {
	function is_wp_error( $thing ): bool {
		return false;
	}
}

if ( ! function_exists( 'get_term_link' ) ) {
	function get_term_link( $term ): string {
		return 'https://example.com/term';
	}
}

if ( ! function_exists( 'wp_print_inline_script_tag' ) ) {
	function wp_print_inline_script_tag( string $javascript, array $attributes = array() ): void {
		$id = isset( $attributes['id'] ) ? ' id="' . $attributes['id'] . '"' : '';
		echo '<script' . $id . '>' . $javascript . '</script>';
	}
}

if ( ! function_exists( 'wp_register_style' ) ) {
	function wp_register_style( ...$args ): bool {
		return true;
	}
}

if ( ! function_exists( 'wp_enqueue_style' ) ) {
	function wp_enqueue_style( ...$args ): void {}
}

if ( ! function_exists( 'wp_add_inline_style' ) ) {
	/**
	 * Records inline CSS per handle in $GLOBALS['ml_test_inline_styles'].
	 */
	function wp_add_inline_style( string $handle, string $data ): bool {
		$GLOBALS['ml_test_inline_styles'][ $handle ] = ( $GLOBALS['ml_test_inline_styles'][ $handle ] ?? '' ) . $data;
		return true;
	}
}

if ( ! class_exists( 'WP_Term' ) ) {
	class WP_Term {}
}

if ( ! class_exists( 'WP_Block' ) ) {
	class WP_Block {
		/** @var array<string, mixed> */
		public array $context = array();
	}
}

if ( ! function_exists( 'is_admin' ) ) {
	function is_admin(): bool {
		return ! empty( $GLOBALS['ml_test_is_admin'] );
	}
}

if ( ! class_exists( 'WP_HTML_Tag_Processor' ) ) {
	/**
	 * Minimal stand-in for the WP 6.2+ tag processor. Walks opening tags in
	 * order (skipping STYLE/SCRIPT contents, like the real one) and only
	 * supports modifying the tag it is currently on.
	 */
	class WP_HTML_Tag_Processor {
		private string $html;
		private int $offset       = 0;
		private ?string $tag_name = null;
		private int $tag_start    = 0;
		private int $tag_length   = 0;
		private ?array $attrs     = null;

		public function __construct( string $html ) {
			$this->html = $html;
		}

		public function next_tag(): bool {
			if ( ! preg_match( '/<([a-z][a-z0-9]*)\s*([^>]*)>/i', $this->html, $m, PREG_OFFSET_CAPTURE, $this->offset ) ) {
				$this->tag_name = null;
				$this->attrs    = null;
				return false;
			}

			$this->tag_name   = strtoupper( $m[1][0] );
			$this->tag_start  = $m[0][1];
			$this->tag_length = strlen( $m[0][0] );
			$this->offset     = $this->tag_start + $this->tag_length;
			$this->attrs      = array();

			if ( preg_match_all( '/([a-zA-Z_:][-a-zA-Z0-9_:.]*)="([^"]*)"/', $m[2][0], $attrMatches, PREG_SET_ORDER ) ) {
				foreach ( $attrMatches as $attr ) {
					$this->attrs[ $attr[1] ] = $attr[2];
				}
			}

			if ( in_array( $this->tag_name, array( 'STYLE', 'SCRIPT' ), true ) ) {
				$close        = stripos( $this->html, '</' . $this->tag_name, $this->offset );
				$this->offset = false === $close ? strlen( $this->html ) : $close;
			}

			return true;
		}

		public function get_tag(): ?string {
			return $this->tag_name;
		}

		public function get_attribute( string $name ): ?string {
			return $this->attrs[ $name ] ?? null;
		}

		public function set_attribute( string $name, string $value ): void {
			if ( ! is_array( $this->attrs ) ) {
				$this->attrs = array();
			}
			$this->attrs[ $name ] = $value;
		}

		public function get_updated_html(): string {
			if ( null === $this->tag_name || ! is_array( $this->attrs ) ) {
				return $this->html;
			}

			$newTag = '<' . strtolower( $this->tag_name );
			foreach ( $this->attrs as $key => $value ) {
				$newTag .= sprintf( ' %s="%s"', $key, htmlspecialchars( $value, ENT_QUOTES, 'UTF-8' ) );
			}
			$newTag .= '>';

			return substr_replace( $this->html, $newTag, $this->tag_start, $this->tag_length );
		}
	}
}

require_once dirname( __DIR__ ) . '/ml-gutenberg-customizations.php';
