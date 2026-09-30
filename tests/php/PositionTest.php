<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

/**
 * Tests for the mlPosition attribute → CSS position output.
 */
final class PositionTest extends TestCase {
	private ML_Gutenberg_Customizations $plugin;

	protected function setUp(): void {
		$this->plugin                     = new ML_Gutenberg_Customizations();
		$GLOBALS['ml_test_inline_styles'] = array();
		$GLOBALS['ml_test_is_admin']      = false;
	}

	private function render( array $position, string $block_content = '<p class="wp-block-paragraph">Hi</p>' ): string {
		return $this->plugin->apply_position(
			$block_content,
			array( 'attrs' => array( 'mlPosition' => $position ) )
		);
	}

	// ── Early-return guards ──────────────────────────────────────────────────

	public function test_block_without_position_is_untouched(): void {
		$block_content = '<p class="wp-block-paragraph">Hi</p>';

		$this->assertSame(
			$block_content,
			$this->plugin->apply_position( $block_content, array( 'attrs' => array() ) )
		);
	}

	public function test_offsets_without_a_position_are_untouched(): void {
		$block_content = '<p class="wp-block-paragraph">Hi</p>';

		$this->assertSame( $block_content, $this->render( array( 'top' => '20px' ), $block_content ) );
	}

	public function test_unknown_position_type_is_untouched(): void {
		$block_content = '<p class="wp-block-paragraph">Hi</p>';

		$this->assertSame( $block_content, $this->render( array( 'type' => 'sideways' ), $block_content ) );
	}

	// ── Output ───────────────────────────────────────────────────────────────

	public function test_relative_alone_is_worth_outputting(): void {
		$updated = $this->render( array( 'type' => 'relative' ) );

		$this->assertStringContainsString( 'class="wp-block-paragraph ml-has-position"', $updated );
		$this->assertStringContainsString( '--ml-position:relative', $updated );
	}

	public function test_absolute_carries_only_the_offsets_that_are_set(): void {
		$updated = $this->render(
			array(
				'type' => 'absolute',
				'top'  => '20px',
				'left' => '10%',
			)
		);

		$this->assertStringContainsString( '--ml-position:absolute;--ml-top:20px;--ml-left:10%', $updated );
		$this->assertStringNotContainsString( '--ml-right', $updated );
		$this->assertStringNotContainsString( '--ml-bottom', $updated );
	}

	public function test_every_position_type_is_allowed(): void {
		foreach ( array( 'relative', 'absolute', 'fixed', 'sticky' ) as $type ) {
			$this->assertStringContainsString(
				'--ml-position:' . $type,
				$this->render( array( 'type' => $type ) )
			);
		}
	}

	public function test_offsets_keep_their_unit_and_are_clamped(): void {
		$updated = $this->render(
			array(
				'type'   => 'absolute',
				'top'    => '-3rem',
				'right'  => '9999px',
				'bottom' => '5VH',
				'left'   => '-9999%',
			)
		);

		$this->assertStringContainsString( '--ml-top:-3rem', $updated );
		$this->assertStringContainsString( '--ml-right:2000px', $updated );
		$this->assertStringContainsString( '--ml-bottom:5vh', $updated );
		$this->assertStringContainsString( '--ml-left:-200%', $updated );
	}

	public function test_unusable_offsets_are_left_at_auto(): void {
		$updated = $this->render(
			array(
				'type' => 'absolute',
				'top'  => '10pt',
				'left' => '20px;color:red',
			)
		);

		$this->assertStringNotContainsString( '--ml-top', $updated );
		$this->assertStringNotContainsString( '--ml-left', $updated );
		$this->assertStringNotContainsString( 'color', $updated );
	}

	public function test_z_index_is_carried_and_clamped(): void {
		$this->assertStringContainsString( '--ml-z:5', $this->render( array( 'type' => 'absolute', 'zIndex' => 5 ) ) );
		$this->assertStringContainsString( '--ml-z:999', $this->render( array( 'type' => 'absolute', 'zIndex' => 99999 ) ) );
		$this->assertStringNotContainsString( '--ml-z', $this->render( array( 'type' => 'absolute', 'zIndex' => 'top' ) ) );
	}

	public function test_disable_on_mobile_adds_the_desktop_only_class(): void {
		$updated = $this->render( array( 'type' => 'absolute', 'disableOnMobile' => true ) );

		$this->assertStringContainsString( 'ml-has-position ml-position-desktop-only', $updated );
	}

	public function test_existing_class_and_style_are_preserved(): void {
		$updated = $this->render(
			array( 'type' => 'absolute', 'top' => '0px' ),
			'<div class="wp-block-group" style="color:red;">Hi</div>'
		);

		$this->assertStringContainsString( 'class="wp-block-group ml-has-position"', $updated );
		$this->assertStringContainsString( 'style="color:red;--ml-position:absolute;--ml-top:0px"', $updated );
	}

	public function test_leading_asset_tags_are_skipped(): void {
		$updated = $this->render(
			array( 'type' => 'relative' ),
			'<style>.x{color:red}</style><div class="x">Hi</div>'
		);

		$this->assertStringContainsString( '<style>.x{color:red}</style><div class="x ml-has-position"', $updated );
	}

	// ── Registration and stylesheets ─────────────────────────────────────────

	public function test_attribute_is_registered(): void {
		$args = $this->plugin->register_position_attribute( array( 'attributes' => array() ) );

		$this->assertSame( array( 'type' => 'object' ), $args['attributes']['mlPosition'] );
	}

	public function test_frontend_stylesheet_maps_the_variables(): void {
		$this->plugin->enqueue_position_styles();

		$css = $GLOBALS['ml_test_inline_styles']['ml-gutenberg-position'] ?? '';

		$this->assertStringContainsString(
			'.ml-has-position{position:var(--ml-position);top:var(--ml-top,auto);right:var(--ml-right,auto);bottom:var(--ml-bottom,auto);left:var(--ml-left,auto);z-index:var(--ml-z,auto)}',
			$css
		);
		$this->assertStringContainsString(
			'@media(max-width:650px){.ml-position-desktop-only{position:static}}',
			$css
		);
	}

	public function test_editor_stylesheet_is_scoped_to_block_wrappers(): void {
		$GLOBALS['ml_test_is_admin'] = true;

		$this->plugin->enqueue_position_editor_styles();

		$css = $GLOBALS['ml_test_inline_styles']['ml-gutenberg-position-editor'] ?? '';

		$this->assertStringContainsString( '[data-block].ml-has-position{position:var(--ml-position) !important', $css );
	}

	public function test_editor_stylesheet_is_not_loaded_on_the_frontend(): void {
		$this->plugin->enqueue_position_editor_styles();

		$this->assertArrayNotHasKey( 'ml-gutenberg-position-editor', $GLOBALS['ml_test_inline_styles'] );
	}
}
