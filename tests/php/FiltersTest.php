<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

/**
 * Tests for the mlFilters attribute → CSS filter output.
 */
final class FiltersTest extends TestCase {
	private ML_Gutenberg_Customizations $plugin;

	protected function setUp(): void {
		$this->plugin                     = new ML_Gutenberg_Customizations();
		$GLOBALS['ml_test_inline_styles'] = array();
		$GLOBALS['ml_test_is_admin']      = false;
	}

	private function render( array $filters, string $block_content = '<p class="wp-block-paragraph">Hi</p>' ): string {
		return $this->plugin->apply_css_filters(
			$block_content,
			array( 'attrs' => array( 'mlFilters' => $filters ) )
		);
	}

	// ── Early-return guards ──────────────────────────────────────────────────

	public function test_block_without_filters_is_untouched(): void {
		$block_content = '<p class="wp-block-paragraph">Hi</p>';

		$this->assertSame(
			$block_content,
			$this->plugin->apply_css_filters( $block_content, array( 'attrs' => array() ) )
		);
	}

	public function test_neutral_filters_are_untouched(): void {
		$block_content = '<p class="wp-block-paragraph">Hi</p>';

		$this->assertSame(
			$block_content,
			$this->render( array( 'brightness' => 100, 'opacity' => 100, 'blur' => 0 ), $block_content )
		);
	}

	// ── Output ───────────────────────────────────────────────────────────────

	public function test_blur_adds_the_class_and_variable(): void {
		$updated = $this->render( array( 'blur' => 4 ) );

		$this->assertStringContainsString( 'class="wp-block-paragraph ml-has-filter"', $updated );
		$this->assertStringContainsString( '--ml-filter:blur(4px)', $updated );
	}

	public function test_filters_are_written_in_a_fixed_order(): void {
		$updated = $this->render(
			array(
				'opacity'    => 90,
				'invert'     => 10,
				'hueRotate'  => 30,
				'sepia'      => 20,
				'grayscale'  => 30,
				'saturate'   => 140,
				'contrast'   => 110,
				'brightness' => 120,
				'blur'       => 2,
			)
		);

		$this->assertStringContainsString(
			'--ml-filter:blur(2px) brightness(120%) contrast(110%) saturate(140%) grayscale(30%) sepia(20%) hue-rotate(30deg) invert(10%) opacity(90%)',
			$updated
		);
	}

	public function test_values_are_clamped(): void {
		$updated = $this->render( array( 'blur' => 9999, 'hueRotate' => -400 ) );

		$this->assertStringContainsString( '--ml-filter:blur(300px) hue-rotate(-180deg)', $updated );
	}

	public function test_values_that_are_not_numbers_are_ignored(): void {
		$updated = $this->render( array( 'blur' => 'soft', 'grayscale' => 50 ) );

		$this->assertStringContainsString( '--ml-filter:grayscale(50%)', $updated );
	}

	public function test_backdrop_target_uses_its_own_class(): void {
		$updated = $this->render( array( 'blur' => 8, 'target' => 'backdrop' ) );

		$this->assertStringContainsString( 'ml-has-backdrop-filter', $updated );
		$this->assertStringNotContainsString( 'ml-has-filter', $updated );
		$this->assertStringContainsString( '--ml-filter:blur(8px)', $updated );
	}

	public function test_disable_on_mobile_adds_the_desktop_only_class(): void {
		$updated = $this->render( array( 'blur' => 4, 'disableOnMobile' => true ) );

		$this->assertStringContainsString( 'ml-has-filter ml-filter-desktop-only', $updated );
	}

	public function test_existing_class_and_style_are_preserved(): void {
		$updated = $this->render(
			array( 'blur' => 4 ),
			'<div class="wp-block-group" style="color:red;">Hi</div>'
		);

		$this->assertStringContainsString( 'class="wp-block-group ml-has-filter"', $updated );
		$this->assertStringContainsString( 'style="color:red;--ml-filter:blur(4px)"', $updated );
	}

	public function test_leading_asset_tags_are_skipped(): void {
		$updated = $this->render(
			array( 'blur' => 4 ),
			'<style>.x{color:red}</style><div class="x">Hi</div>'
		);

		$this->assertStringContainsString( '<style>.x{color:red}</style><div class="x ml-has-filter"', $updated );
	}

	// ── Registration and stylesheets ─────────────────────────────────────────

	public function test_attribute_is_registered(): void {
		$args = $this->plugin->register_filter_attribute( array( 'attributes' => array() ) );

		$this->assertSame( array( 'type' => 'object' ), $args['attributes']['mlFilters'] );
	}

	public function test_frontend_stylesheet_maps_the_variable(): void {
		$this->plugin->enqueue_filter_styles();

		$css = $GLOBALS['ml_test_inline_styles']['ml-gutenberg-filters'] ?? '';

		$this->assertStringContainsString( '.ml-has-filter{filter:var(--ml-filter)}', $css );
		$this->assertStringContainsString( '.ml-has-backdrop-filter{-webkit-backdrop-filter:var(--ml-filter);backdrop-filter:var(--ml-filter)}', $css );
		$this->assertStringContainsString( '@media(max-width:650px){.ml-filter-desktop-only{filter:none;-webkit-backdrop-filter:none;backdrop-filter:none}}', $css );
	}

	public function test_editor_stylesheet_is_scoped_to_block_wrappers(): void {
		$GLOBALS['ml_test_is_admin'] = true;

		$this->plugin->enqueue_filter_editor_styles();

		$css = $GLOBALS['ml_test_inline_styles']['ml-gutenberg-filters-editor'] ?? '';

		$this->assertStringContainsString( '[data-block].ml-has-filter{filter:var(--ml-filter) !important}', $css );
	}

	public function test_editor_stylesheet_is_not_loaded_on_the_frontend(): void {
		$this->plugin->enqueue_filter_editor_styles();

		$this->assertArrayNotHasKey( 'ml-gutenberg-filters-editor', $GLOBALS['ml_test_inline_styles'] );
	}
}
