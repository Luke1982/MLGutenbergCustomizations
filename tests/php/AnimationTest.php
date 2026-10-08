<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

/**
 * Tests for the mlAnimation attribute → animated block markup.
 */
final class AnimationTest extends TestCase {
	private ML_Gutenberg_Customizations $plugin;

	protected function setUp(): void {
		$this->plugin = new ML_Gutenberg_Customizations();
	}

	private function render( array $animation, string $block_content = '<p class="wp-block-paragraph">Hi</p>' ): string {
		return $this->plugin->apply_animation(
			$block_content,
			array( 'attrs' => array( 'mlAnimation' => $animation ) )
		);
	}

	public function test_block_without_an_animation_is_untouched(): void {
		$block_content = '<p class="wp-block-paragraph">Hi</p>';

		$this->assertSame(
			$block_content,
			$this->plugin->apply_animation( $block_content, array( 'attrs' => array() ) )
		);
	}

	public function test_an_unknown_animation_is_untouched(): void {
		$block_content = '<p class="wp-block-paragraph">Hi</p>';

		$this->assertSame( $block_content, $this->render( array( 'name' => 'explode' ), $block_content ) );
	}

	public function test_an_animation_adds_its_classes_and_settings(): void {
		$updated = $this->render(
			array(
				'name'     => 'wiggle',
				'strength' => 1.5,
				'duration' => 600,
				'delay'    => 200,
				'repeat'   => 3,
			)
		);

		$this->assertStringContainsString( 'class="wp-block-paragraph ml-anim ml-anim-wiggle"', $updated );
		$this->assertStringContainsString( '--ml-anim-strength:1.5', $updated );
		$this->assertStringContainsString( '--ml-anim-duration:600ms', $updated );
		$this->assertStringContainsString( '--ml-anim-delay:200ms', $updated );
		$this->assertStringContainsString( '--ml-anim-repeat:3', $updated );
	}

	public function test_a_delay_of_zero_is_left_out(): void {
		$updated = $this->render( array( 'name' => 'pulse' ) );

		$this->assertStringNotContainsString( '--ml-anim-delay', $updated );
	}

	public function test_it_can_loop_forever(): void {
		$updated = $this->render( array( 'name' => 'pulse', 'repeat' => 'infinite' ) );

		$this->assertStringContainsString( '--ml-anim-repeat:infinite', $updated );
	}

	public function test_values_are_clamped(): void {
		$updated = $this->render(
			array(
				'name'     => 'pulse',
				'strength' => 99,
				'duration' => 99999,
				'delay'    => -5,
			)
		);

		$this->assertStringContainsString( '--ml-anim-strength:3', $updated );
		$this->assertStringContainsString( '--ml-anim-duration:10000ms', $updated );
		$this->assertStringNotContainsString( '--ml-anim-delay', $updated );
	}

	public function test_every_offered_animation_renders(): void {
		foreach ( array( 'pulse', 'throb', 'heartbeat', 'wiggle', 'shake-x', 'shake-y', 'head-shake', 'bounce', 'float', 'swing', 'tada', 'wobble', 'jello', 'rubber-band', 'flash', 'spin' ) as $name ) {
			$this->assertStringContainsString( 'ml-anim-' . $name, $this->render( array( 'name' => $name ) ) );
		}
	}

	public function test_it_can_sit_still_on_mobile(): void {
		$updated = $this->render( array( 'name' => 'pulse', 'disableOnMobile' => true ) );

		$this->assertStringContainsString( 'ml-anim ml-anim-pulse ml-anim-desktop-only', $updated );
	}

	public function test_existing_class_and_style_are_preserved(): void {
		$updated = $this->render(
			array( 'name' => 'pulse' ),
			'<div class="wp-block-group" style="color:red;">Hi</div>'
		);

		$this->assertStringContainsString( 'class="wp-block-group ml-anim ml-anim-pulse"', $updated );
		$this->assertStringContainsString( 'style="color:red;--ml-anim-strength:', $updated );
	}

	public function test_attribute_is_registered(): void {
		$args = $this->plugin->register_animation_attribute( array( 'attributes' => array() ) );

		$this->assertSame( array( 'type' => 'object' ), $args['attributes']['mlAnimation'] );
	}
}
