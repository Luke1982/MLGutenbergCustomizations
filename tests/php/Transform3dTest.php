<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

/**
 * Tests for the mlTransform3d attribute → CSS custom properties output.
 */
final class Transform3dTest extends TestCase {
	private ML_Gutenberg_Customizations $plugin;

	protected function setUp(): void {
		$this->plugin                     = new ML_Gutenberg_Customizations();
		$GLOBALS['ml_test_inline_styles'] = array();
		$GLOBALS['ml_test_is_admin']      = false;
	}

	private function render( array $transform, string $block_content = '<p class="wp-block-paragraph">Hi</p>' ): string {
		return $this->plugin->apply_transform_3d(
			$block_content,
			array( 'attrs' => array( 'mlTransform3d' => $transform ) )
		);
	}

	// ── Early-return guard ───────────────────────────────────────────────────

	public function test_block_without_transform_is_untouched(): void {
		$block_content = '<p class="wp-block-paragraph">Hi</p>';

		$updated = $this->plugin->apply_transform_3d( $block_content, array( 'attrs' => array() ) );

		$this->assertSame( $block_content, $updated );
	}

	public function test_neutral_transform_is_untouched(): void {
		$block_content = '<p class="wp-block-paragraph">Hi</p>';

		$updated = $this->render(
			array(
				'perspective'     => 500,
				'origin'          => 'top left',
				'disableOnMobile' => true,
				'rotateX'         => 0,
				'scale'           => 1,
			),
			$block_content
		);

		$this->assertSame( $block_content, $updated );
	}

	// ── Output ───────────────────────────────────────────────────────────────

	public function test_rotation_outputs_class_and_css_variables(): void {
		$updated = $this->render( array( 'rotateX' => 45 ) );

		$this->assertSame(
			'<p class="wp-block-paragraph ml-has-3d-transform" style="--ml-3d-transform:perspective(1000px) rotateX(45deg);--ml-3d-origin:center center">Hi</p>',
			$updated
		);
	}

	public function test_all_functions_are_combined_in_a_fixed_order(): void {
		$updated = $this->render(
			array(
				'scale'       => 1.5,
				'rotateZ'     => 30,
				'rotateY'     => 20,
				'rotateX'     => 10,
				'translateZ'  => 30,
				'translateY'  => -20,
				'translateX'  => 10,
				'perspective' => 800,
			)
		);

		$this->assertStringContainsString(
			'--ml-3d-transform:perspective(800px) translate3d(10px, -20px, 30px) rotateX(10deg) rotateY(20deg) rotateZ(30deg) scale(1.5);',
			$updated
		);
	}

	public function test_zero_perspective_is_omitted(): void {
		$updated = $this->render(
			array(
				'perspective' => 0,
				'rotateY'     => 30,
			)
		);

		$this->assertStringContainsString( '--ml-3d-transform:rotateY(30deg);', $updated );
	}

	public function test_existing_inline_style_is_preserved(): void {
		$updated = $this->render(
			array( 'rotateZ' => 5 ),
			'<div class="wp-block-group" style="color:red;">Hi</div>'
		);

		$this->assertStringContainsString(
			'style="color:red;--ml-3d-transform:perspective(1000px) rotateZ(5deg);--ml-3d-origin:center center"',
			$updated
		);
	}

	public function test_valid_origin_is_used(): void {
		$updated = $this->render(
			array(
				'rotateZ' => 5,
				'origin'  => 'bottom right',
			)
		);

		$this->assertStringContainsString( '--ml-3d-origin:bottom right"', $updated );
	}

	public function test_negative_values_and_scales_below_one_are_kept(): void {
		$updated = $this->render(
			array(
				'rotateX'    => -30,
				'rotateY'    => -999,
				'translateZ' => 20,
				'scale'      => 0.5,
			)
		);

		$this->assertStringContainsString(
			'--ml-3d-transform:perspective(1000px) translate3d(0px, 0px, 20px) rotateX(-30deg) rotateY(-180deg) scale(0.5);',
			$updated
		);
	}

	public function test_scale_of_zero_is_a_transform(): void {
		$updated = $this->render( array( 'scale' => 0 ) );

		$this->assertStringContainsString( '--ml-3d-transform:perspective(1000px) scale(0);', $updated );
	}

	public function test_negative_zero_is_never_printed(): void {
		$updated = $this->render(
			array(
				'translateX' => 5,
				'translateY' => -0.001,
			)
		);

		$this->assertStringContainsString( '--ml-3d-transform:perspective(1000px) translate3d(5px, 0px, 0px);', $updated );
	}

	public function test_leading_asset_tags_are_skipped(): void {
		$updated = $this->render(
			array( 'rotateZ' => 5 ),
			'<link rel="stylesheet" href="a.css"><style>.x{color:red}</style><script type="application/ld+json">{}</script><div class="x">Hi</div>'
		);

		$this->assertSame(
			'<link rel="stylesheet" href="a.css"><style>.x{color:red}</style><script type="application/ld+json">{}</script>'
			. '<div class="x ml-has-3d-transform" style="--ml-3d-transform:perspective(1000px) rotateZ(5deg);--ml-3d-origin:center center">Hi</div>',
			$updated
		);
	}

	public function test_disable_on_mobile_adds_desktop_only_class(): void {
		$updated = $this->render(
			array(
				'rotateZ'         => 5,
				'disableOnMobile' => true,
			)
		);

		$this->assertStringContainsString( 'class="wp-block-paragraph ml-has-3d-transform ml-3d-desktop-only"', $updated );
	}

	// ── Input sanitisation ───────────────────────────────────────────────────

	public function test_values_are_clamped_to_slider_ranges(): void {
		$updated = $this->render(
			array(
				'perspective' => 99999,
				'rotateX'     => 999,
				'translateX'  => -9999,
				'scale'       => 10,
			)
		);

		$this->assertStringContainsString(
			'--ml-3d-transform:perspective(3000px) translate3d(-2000px, 0px, 0px) rotateX(180deg) scale(3);',
			$updated
		);
	}

	public function test_translate_accepts_units_other_than_px(): void {
		$updated = $this->render(
			array(
				'translateX' => '50%',
				'translateY' => '-2.5em',
				'translateZ' => '10VW',
			)
		);

		$this->assertStringContainsString( '--ml-3d-transform:perspective(1000px) translate3d(50%, -2.5em, 10vw);', $updated );
	}

	public function test_unitless_translate_values_are_px(): void {
		$updated = $this->render(
			array(
				'translateX' => '15',
				'translateY' => 20,
			)
		);

		$this->assertStringContainsString( '--ml-3d-transform:perspective(1000px) translate3d(15px, 20px, 0px);', $updated );
	}

	public function test_percent_is_rejected_on_translate_z(): void {
		$updated = $this->render(
			array(
				'translateZ' => '10%',
				'rotateZ'    => 5,
			)
		);

		$this->assertStringContainsString( '--ml-3d-transform:perspective(1000px) rotateZ(5deg);', $updated );
	}

	public function test_unknown_units_and_junk_in_translate_are_rejected(): void {
		$updated = $this->render(
			array(
				'translateX' => '10pt',
				'translateY' => '5px);color:red',
				'rotateZ'    => 5,
			)
		);

		$this->assertStringContainsString( '--ml-3d-transform:perspective(1000px) rotateZ(5deg);', $updated );
		$this->assertStringNotContainsString( 'color', $updated );
	}

	public function test_translate_is_clamped_to_the_range_of_its_unit(): void {
		$updated = $this->render(
			array(
				'translateX' => '9999px',
				'translateY' => '-9999%',
				'translateZ' => '999rem',
			)
		);

		$this->assertStringContainsString( '--ml-3d-transform:perspective(1000px) translate3d(2000px, -500%, 100rem);', $updated );
	}

	public function test_non_numeric_values_are_ignored(): void {
		$updated = $this->render(
			array(
				'rotateX' => 'abc',
				'rotateY' => null,
				'rotateZ' => '15',
			)
		);

		$this->assertStringContainsString( '--ml-3d-transform:perspective(1000px) rotateZ(15deg);', $updated );
	}

	public function test_non_finite_values_are_ignored(): void {
		$updated = $this->render(
			array(
				'rotateX' => '1e400',
				'rotateZ' => 15,
			)
		);

		$this->assertStringContainsString( '--ml-3d-transform:perspective(1000px) rotateZ(15deg);', $updated );
	}

	public function test_invalid_origin_falls_back_to_center(): void {
		$updated = $this->render(
			array(
				'rotateZ' => 5,
				'origin'  => 'center;background:url(x)',
			)
		);

		$this->assertStringContainsString( '--ml-3d-origin:center center"', $updated );
		$this->assertStringNotContainsString( 'background', $updated );
	}

	public function test_non_array_attribute_is_ignored(): void {
		$block_content = '<p class="wp-block-paragraph">Hi</p>';

		$updated = $this->plugin->apply_transform_3d(
			$block_content,
			array( 'attrs' => array( 'mlTransform3d' => 'rotateX(45deg)' ) )
		);

		$this->assertSame( $block_content, $updated );
	}

	// ── Attribute registration ───────────────────────────────────────────────

	public function test_attribute_is_registered_alongside_existing_attributes(): void {
		$args = $this->plugin->register_transform_3d_attribute(
			array( 'attributes' => array( 'content' => array( 'type' => 'string' ) ) )
		);

		$this->assertSame( array( 'type' => 'string' ), $args['attributes']['content'] );
		$this->assertSame( array( 'type' => 'object' ), $args['attributes']['mlTransform3d'] );
	}

	public function test_attribute_is_registered_on_blocks_without_attributes(): void {
		$args = $this->plugin->register_transform_3d_attribute( array() );

		$this->assertSame( array( 'type' => 'object' ), $args['attributes']['mlTransform3d'] );
	}

	// ── Frontend stylesheet ──────────────────────────────────────────────────

	public function test_stylesheet_maps_css_variables_to_transform(): void {
		$this->plugin->enqueue_transform_3d_styles();

		$css = $GLOBALS['ml_test_inline_styles']['ml-gutenberg-3d-transform'] ?? '';

		$this->assertStringContainsString(
			'.ml-has-3d-transform{transform:var(--ml-3d-transform);transform-origin:var(--ml-3d-origin)}',
			$css
		);
	}

	public function test_stylesheet_disables_desktop_only_transforms_below_breakpoint(): void {
		$this->plugin->enqueue_transform_3d_styles();

		$css = $GLOBALS['ml_test_inline_styles']['ml-gutenberg-3d-transform'] ?? '';

		$this->assertStringContainsString(
			'@media(max-width:650px){.ml-has-3d-transform.ml-3d-desktop-only{transform:none}}',
			$css
		);
	}

	// ── Editor stylesheet ────────────────────────────────────────────────────

	public function test_editor_stylesheet_scopes_preview_to_block_wrappers(): void {
		$GLOBALS['ml_test_is_admin'] = true;

		$this->plugin->enqueue_transform_3d_editor_styles();

		$css = $GLOBALS['ml_test_inline_styles']['ml-gutenberg-3d-transform-editor'] ?? '';

		$this->assertStringContainsString(
			'[data-block].ml-has-3d-transform{transform:var(--ml-3d-transform) !important;transform-origin:var(--ml-3d-origin) !important}',
			$css
		);
		$this->assertStringContainsString(
			'@media(max-width:650px){[data-block].ml-has-3d-transform.ml-3d-desktop-only{transform:none !important}}',
			$css
		);
	}

	public function test_editor_stylesheet_is_not_loaded_on_the_frontend(): void {
		$this->plugin->enqueue_transform_3d_editor_styles();

		$this->assertArrayNotHasKey( 'ml-gutenberg-3d-transform-editor', $GLOBALS['ml_test_inline_styles'] );
	}
}
