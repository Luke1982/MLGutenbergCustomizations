<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

/**
 * Tests for the mlScrollReveal / mlScrollFx attributes → markup the
 * frontend scroll engine reads.
 */
final class ScrollAnimationTest extends TestCase {
	private ML_Gutenberg_Customizations $plugin;

	protected function setUp(): void {
		$this->plugin = new ML_Gutenberg_Customizations();
	}

	private function render( array $attrs, string $block_content = '<p class="wp-block-paragraph">Hi</p>' ): string {
		return $this->plugin->apply_scroll_animation( $block_content, array( 'attrs' => $attrs ) );
	}

	private function reveal( array $reveal, string $block_content = '<p class="wp-block-paragraph">Hi</p>' ): string {
		return $this->render( array( 'mlScrollReveal' => array_merge( array( 'enabled' => true ), $reveal ) ), $block_content );
	}

	private function data( string $html, string $attribute ): array {
		preg_match( '/' . preg_quote( $attribute, '/' ) . '="([^"]+)"/', $html, $matches );
		$this->assertNotEmpty( $matches[1] ?? '', $attribute . ' not found in: ' . $html );
		$decoded = json_decode( html_entity_decode( $matches[1] ), true );
		$this->assertIsArray( $decoded );
		return $decoded;
	}

	// ── Early-return guard ───────────────────────────────────────────────────

	public function test_block_without_settings_is_untouched(): void {
		$block_content = '<p class="wp-block-paragraph">Hi</p>';

		$this->assertSame( $block_content, $this->render( array() ) );
	}

	public function test_disabled_settings_are_untouched(): void {
		$block_content = '<p class="wp-block-paragraph">Hi</p>';

		$updated = $this->render(
			array(
				'mlScrollReveal' => array( 'enabled' => false, 'effect' => 'slide-bottom' ),
				'mlScrollFx'     => array( 'enabled' => false, 'rotateY' => 20 ),
			)
		);

		$this->assertSame( $block_content, $updated );
	}

	// ── Reveal ───────────────────────────────────────────────────────────────

	public function test_reveal_adds_class_and_settings(): void {
		$updated = $this->reveal( array( 'effect' => 'slide-bottom', 'amount' => 40 ) );

		$this->assertStringContainsString( 'class="wp-block-paragraph ml-reveal"', $updated );

		$data = $this->data( $updated, 'data-ml-reveal' );

		$this->assertSame( 'slide-bottom', $data['effect'] );
		$this->assertSame( 40, $data['amount'] );
		$this->assertSame( 600, $data['duration'] );
		$this->assertSame( 'ease-out', $data['easing'] );
		$this->assertTrue( $data['once'] );
	}

	public function test_slide_start_state_is_written_as_css_variables(): void {
		$updated = $this->reveal( array( 'effect' => 'slide-bottom', 'amount' => 40 ) );

		$this->assertStringContainsString( '--ml-reveal-from:translate3d(0px, 40px, 0px)', $updated );
		$this->assertStringContainsString( '--ml-reveal-opacity:0', $updated );
	}

	public function test_flip_start_state_carries_perspective(): void {
		$updated = $this->reveal( array( 'effect' => 'flip-x', 'amount' => 60 ) );

		$this->assertStringContainsString( '--ml-reveal-from:perspective(1000px) rotateX(60deg)', $updated );
	}

	public function test_blur_start_state_uses_a_filter(): void {
		$updated = $this->reveal( array( 'effect' => 'blur', 'amount' => 8 ) );

		$this->assertStringContainsString( '--ml-reveal-filter:blur(8px)', $updated );
		$this->assertStringNotContainsString( '--ml-reveal-from:', $updated );
	}

	public function test_wipe_start_state_clips_the_block(): void {
		$updated = $this->reveal( array( 'effect' => 'wipe' ) );

		$this->assertStringContainsString( '--ml-reveal-clip:inset(0% 0% 100% 0%)', $updated );
	}

	public function test_plain_fade_only_hides_the_block(): void {
		$updated = $this->reveal( array( 'effect' => 'fade' ) );

		$this->assertStringContainsString( '--ml-reveal-opacity:0', $updated );
		$this->assertStringNotContainsString( '--ml-reveal-from:', $updated );
	}

	public function test_a_move_without_fade_starts_fully_opaque(): void {
		$updated = $this->reveal( array( 'effect' => 'slide-bottom', 'fade' => false ) );

		$this->assertStringContainsString( '--ml-reveal-opacity:1', $updated );
	}

	public function test_unknown_effect_and_easing_fall_back(): void {
		$data = $this->data(
			$this->reveal( array( 'effect' => 'explode', 'easing' => 'wobble' ) ),
			'data-ml-reveal'
		);

		$this->assertSame( 'fade', $data['effect'] );
		$this->assertSame( 'ease-out', $data['easing'] );
	}

	public function test_reveal_values_are_clamped(): void {
		$data = $this->data(
			$this->reveal( array( 'duration' => 99999, 'threshold' => 5, 'stagger' => -10, 'delay' => -1 ) ),
			'data-ml-reveal'
		);

		$this->assertSame( 5000, $data['duration'] );
		$this->assertSame( 1, $data['threshold'] );
		$this->assertSame( 0, $data['stagger'] );
		$this->assertSame( 0, $data['delay'] );
	}

	public function test_staggering_marks_the_container_so_its_children_animate(): void {
		$updated = $this->reveal( array( 'effect' => 'slide-bottom', 'stagger' => 80 ) );

		$this->assertStringContainsString( 'ml-reveal ml-reveal-stagger', $updated );
		$this->assertSame( 80, $this->data( $updated, 'data-ml-reveal' )['stagger'] );
	}

	public function test_without_stagger_the_container_animates_itself(): void {
		$updated = $this->reveal( array( 'effect' => 'slide-bottom' ) );

		$this->assertStringNotContainsString( 'ml-reveal-stagger', $updated );
	}

	// ── Scroll effects ───────────────────────────────────────────────────────

	public function test_scroll_fx_adds_class_and_settings(): void {
		$updated = $this->render(
			array( 'mlScrollFx' => array( 'enabled' => true, 'rotateY' => 20, 'translateY' => 60 ) )
		);

		$this->assertStringContainsString( 'ml-scroll-fx', $updated );

		$data = $this->data( $updated, 'data-ml-scroll-fx' );

		$this->assertSame( 20, $data['rotateY'] );
		$this->assertSame( 60, $data['translateY'] );
		$this->assertSame( 'centered', $data['mode'] );
		$this->assertSame( 1000, $data['perspective'] );
		$this->assertSame( 0.15, $data['smoothing'] );
	}

	public function test_scroll_fx_unknown_mode_falls_back_to_centered(): void {
		$data = $this->data(
			$this->render( array( 'mlScrollFx' => array( 'enabled' => true, 'rotateY' => 5, 'mode' => 'sideways' ) ) ),
			'data-ml-scroll-fx'
		);

		$this->assertSame( 'centered', $data['mode'] );
	}

	public function test_scroll_fx_values_are_clamped(): void {
		$data = $this->data(
			$this->render(
				array(
					'mlScrollFx' => array(
						'enabled'   => true,
						'rotateX'   => 9999,
						'blur'      => -5,
						'smoothing' => 2,
						'opacity'   => 'abc',
					),
				)
			),
			'data-ml-scroll-fx'
		);

		$this->assertSame( 180, $data['rotateX'] );
		$this->assertSame( 0, $data['blur'] );
		$this->assertSame( 0.95, $data['smoothing'] );
		$this->assertSame( 0, $data['opacity'] );
	}

	public function test_scroll_fx_alone_writes_no_reveal_variables(): void {
		$updated = $this->render( array( 'mlScrollFx' => array( 'enabled' => true, 'rotateY' => 20 ) ) );

		$this->assertStringNotContainsString( '--ml-reveal', $updated );
		$this->assertStringNotContainsString( 'ml-reveal"', $updated );
	}

	// ── Combining ────────────────────────────────────────────────────────────

	public function test_both_features_on_one_block(): void {
		$updated = $this->render(
			array(
				'mlScrollReveal' => array( 'enabled' => true, 'effect' => 'zoom-in' ),
				'mlScrollFx'     => array( 'enabled' => true, 'rotateZ' => 10 ),
			)
		);

		$this->assertStringContainsString( 'ml-reveal', $updated );
		$this->assertStringContainsString( 'ml-scroll-fx', $updated );
		$this->assertStringContainsString( 'data-ml-reveal=', $updated );
		$this->assertStringContainsString( 'data-ml-scroll-fx=', $updated );
	}

	public function test_existing_class_and_style_are_preserved(): void {
		$updated = $this->reveal(
			array( 'effect' => 'slide-bottom', 'amount' => 40 ),
			'<div class="wp-block-group" style="color:red;">Hi</div>'
		);

		$this->assertStringContainsString( 'class="wp-block-group ml-reveal"', $updated );
		$this->assertStringContainsString( 'style="color:red;--ml-reveal-from:', $updated );
	}

	public function test_leading_asset_tags_are_skipped(): void {
		$updated = $this->reveal(
			array( 'effect' => 'fade' ),
			'<style>.x{color:red}</style><div class="x">Hi</div>'
		);

		$this->assertStringContainsString( '<style>.x{color:red}</style><div class="x ml-reveal"', $updated );
	}

	// ── Registration and no-JS safety ────────────────────────────────────────

	public function test_attributes_are_registered_on_blocks(): void {
		$args = $this->plugin->register_scroll_animation_attributes( array( 'attributes' => array( 'content' => array( 'type' => 'string' ) ) ) );

		$this->assertSame( array( 'type' => 'string' ), $args['attributes']['content'] );
		$this->assertSame( array( 'type' => 'object' ), $args['attributes']['mlScrollReveal'] );
		$this->assertSame( array( 'type' => 'object' ), $args['attributes']['mlScrollFx'] );
	}

	public function test_ready_class_is_only_added_when_javascript_runs(): void {
		ob_start();
		$this->plugin->print_scroll_ready_class();
		$output = (string) ob_get_clean();

		$this->assertStringContainsString( 'ml-scroll-ready', $output );
		$this->assertStringContainsString( '<script', $output );
	}
}
