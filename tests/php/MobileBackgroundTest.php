<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

/**
 * Tests for the mlMobileBackground attribute → mobile background output.
 */
final class MobileBackgroundTest extends TestCase {
	private ML_Gutenberg_Customizations $plugin;

	protected function setUp(): void {
		$this->plugin = new ML_Gutenberg_Customizations();
	}

	private function render( array $background, array $extra = array() ): string {
		return $this->plugin->apply_block_customizations(
			'<div class="wp-block-group">Hi</div>',
			array( 'attrs' => array_merge( array( 'mlMobileBackground' => $background ), $extra ) )
		);
	}

	public function test_block_without_the_setting_is_untouched(): void {
		$block_content = '<div class="wp-block-group">Hi</div>';

		$this->assertSame(
			$block_content,
			$this->plugin->apply_block_customizations( $block_content, array( 'attrs' => array() ) )
		);
	}

	public function test_hiding_the_background_adds_its_class(): void {
		$updated = $this->render( array( 'hide' => true ) );

		$this->assertStringContainsString( 'has-mobile-bg-hidden', $updated );
	}

	public function test_size_travels_as_a_class_and_variable(): void {
		$updated = $this->render( array( 'size' => 'contain' ) );

		$this->assertStringContainsString( 'has-mobile-bg-size', $updated );
		$this->assertStringContainsString( '--ml-mobile-bg-size:contain', $updated );
	}

	public function test_a_focal_point_becomes_percentages(): void {
		$updated = $this->render( array( 'position' => array( 'x' => 0.25, 'y' => 0.8 ) ) );

		$this->assertStringContainsString( 'has-mobile-bg-position', $updated );
		$this->assertStringContainsString( '--ml-mobile-bg-position:25% 80%', $updated );
	}

	public function test_an_unknown_size_is_ignored(): void {
		$updated = $this->render( array( 'size' => 'squish' ) );

		$this->assertStringNotContainsString( 'has-mobile-bg-size', $updated );
	}

	public function test_a_block_with_its_own_breakpoint_gets_inline_rules(): void {
		$updated = $this->render(
			array(
				'hide'     => true,
				'size'     => 'cover',
				'position' => array( 'x' => 0, 'y' => 1 ),
			),
			array( 'mlMobileBreakpoint' => 800 )
		);

		$this->assertStringContainsString( '@media(max-width:800px)', $updated );
		$this->assertStringContainsString( 'background-image:none !important', $updated );
		$this->assertStringContainsString( 'background-size:cover !important', $updated );
		$this->assertStringContainsString( 'background-position:0% 100% !important', $updated );
		$this->assertStringNotContainsString( 'has-mobile-bg-', $updated );
	}
}
