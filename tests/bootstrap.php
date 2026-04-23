<?php

declare(strict_types=1);

if (!defined('ABSPATH')) {
	define('ABSPATH', __DIR__);
}

if (!function_exists('add_action')) {
	function add_action(...$args): void {}
}

if (!function_exists('add_filter')) {
	function add_filter(...$args): void {}
}

if (!function_exists('wp_get_global_settings')) {
	function wp_get_global_settings(array $path = array()): array {
		return array('contentSize' => '650px');
	}
}

if (!function_exists('sanitize_key')) {
	function sanitize_key(string $key): string {
		$key = strtolower($key);
		return preg_replace('/[^a-z0-9_\-]/', '', $key) ?? '';
	}
}

if (!function_exists('sanitize_html_class')) {
	function sanitize_html_class(string $class): string {
		return preg_replace('/[^A-Za-z0-9_-]/', '', $class) ?? '';
	}
}

if (!function_exists('esc_attr')) {
	function esc_attr(string $value): string {
		return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
	}
}

if (!function_exists('esc_url')) {
	function esc_url(string $url): string {
		return $url;
	}
}

if (!function_exists('wp_json_encode')) {
	function wp_json_encode($value): string {
		return (string) json_encode($value);
	}
}

if (!function_exists('absint')) {
	function absint($maybeint): int {
		return abs((int) $maybeint);
	}
}

if (!function_exists('get_the_ID')) {
	function get_the_ID(): int {
		return 0;
	}
}

if (!function_exists('get_permalink')) {
	function get_permalink(int $post_id): string {
		return 'https://example.com/post/' . $post_id;
	}
}

if (!function_exists('taxonomy_exists')) {
	function taxonomy_exists(string $taxonomy): bool {
		return false;
	}
}

if (!function_exists('get_term')) {
	function get_term(int $term_id, string $taxonomy = '') {
		return null;
	}
}

if (!function_exists('get_the_terms')) {
	function get_the_terms(int $post_id, string $taxonomy) {
		return array();
	}
}

if (!function_exists('is_wp_error')) {
	function is_wp_error($thing): bool {
		return false;
	}
}

if (!function_exists('get_term_link')) {
	function get_term_link($term): string {
		return 'https://example.com/term';
	}
}

if (!class_exists('WP_Term')) {
	class WP_Term {}
}

if (!class_exists('WP_Block')) {
	class WP_Block {
		/** @var array<string, mixed> */
		public array $context = array();
	}
}

if (!class_exists('WP_HTML_Tag_Processor')) {
	class WP_HTML_Tag_Processor {
		private string $html;
		private ?string $tag = null;
		private ?array $attrs = null;
		private bool $consumed = false;

		public function __construct(string $html) {
			$this->html = $html;
		}

		public function next_tag(): bool {
			if ($this->consumed) {
				return false;
			}

			$this->consumed = true;

			if (!preg_match('/<([a-z][a-z0-9]*)\s*([^>]*)>/i', $this->html, $m)) {
				return false;
			}

			$this->tag = $m[0];
			$this->attrs = array();
			$attrText = $m[2] ?? '';

			if (preg_match_all('/([a-zA-Z_:][-a-zA-Z0-9_:.]*)="([^"]*)"/', $attrText, $attrMatches, PREG_SET_ORDER)) {
				foreach ($attrMatches as $attr) {
					$this->attrs[$attr[1]] = $attr[2];
				}
			}

			return true;
		}

		public function get_attribute(string $name): ?string {
			return $this->attrs[$name] ?? null;
		}

		public function set_attribute(string $name, string $value): void {
			if (!is_array($this->attrs)) {
				$this->attrs = array();
			}
			$this->attrs[$name] = $value;
		}

		public function get_updated_html(): string {
			if (!$this->tag || !is_array($this->attrs)) {
				return $this->html;
			}

			$tagName = 'div';
			if (preg_match('/^<([a-z][a-z0-9]*)/i', $this->tag, $m)) {
				$tagName = strtolower($m[1]);
			}

			$newTag = '<' . $tagName;
			foreach ($this->attrs as $key => $value) {
				$newTag .= sprintf(' %s="%s"', $key, $value);
			}
			$newTag .= '>';

			return preg_replace('/<([a-z][a-z0-9]*)\s*([^>]*)>/i', $newTag, $this->html, 1) ?? $this->html;
		}
	}
}

require_once dirname(__DIR__) . '/ml-gutenberg-customizations.php';
