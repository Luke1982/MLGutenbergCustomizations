<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

/**
 * Tests for the mlTextGradient attribute → gradient-filled text.
 */
final class TextGradientTest extends TestCase {
	private ML_Gutenberg_Customizations $plugin;

	private const LINEAR = 'linear-gradient(135deg, rgb(6,147,227) 0%, rgb(155,81,224) 100%)';

	protected function setUp(): void {
		$this->plugin                     = new ML_Gutenberg_Customizations();
		$GLOBALS['ml_test_inline_styles'] = array();
		$GLOBALS['ml_test_is_admin']      = false;
	}

	private function render( $gradient, string $block_content = '<p class="wp-block-paragraph">Hi</p>' ): string {
		return $this->plugin->apply_text_gradient(
			$block_content,
			array( 'attrs' => array( 'mlTextGradient' => $gradient ) )
		);
	}

	public function test_block_without_a_gradient_is_untouched(): void {
		$block_content = '<p class="wp-block-paragraph">Hi</p>';

		$this->assertSame(
			$block_content,
			$this->plugin->apply_text_gradient( $block_content, array( 'attrs' => array() ) )
		);
	}

	public function test_a_gradient_adds_the_class_and_variable(): void {
		$updated = $this->render( self::LINEAR );

		$this->assertStringContainsString( 'class="wp-block-paragraph ml-has-text-gradient"', $updated );
		$this->assertStringContainsString( '--ml-text-gradient:' . self::LINEAR, $updated );
	}

	public function test_every_gradient_function_is_allowed(): void {
		foreach ( array(
			'radial-gradient(circle, #fff 0%, #000 100%)',
			'conic-gradient(from 90deg, red, blue)',
			'repeating-linear-gradient(45deg, red 0 10px, blue 10px 20px)',
		) as $gradient ) {
			$this->assertStringContainsString( '--ml-text-gradient:' . $gradient, $this->render( $gradient ) );
		}
	}

	public function test_anything_that_is_not_a_gradient_is_refused(): void {
		$block_content = '<p class="wp-block-paragraph">Hi</p>';

		foreach ( array( 'red', '', 42, array( 'linear-gradient(red, blue)' ) ) as $value ) {
			$this->assertSame( $block_content, $this->render( $value, $block_content ) );
		}
	}

	public function test_attempts_to_break_out_of_the_declaration_are_refused(): void {
		$block_content = '<p class="wp-block-paragraph">Hi</p>';

		foreach ( array(
			'linear-gradient(red, blue); color: red',
			'linear-gradient(red, blue)} body{display:none',
			'url(evil.png)',
			'linear-gradient(red, url(evil.png))',
			'linear-gradient(red, blue)/*x*/',
			'linear-gradient(expression(alert(1)), blue)',
		) as $value ) {
			$this->assertSame( $block_content, $this->render( $value, $block_content ), $value );
		}
	}

	public function test_existing_class_and_style_are_preserved(): void {
		$updated = $this->render( self::LINEAR, '<h2 class="wp-block-heading" style="color:red;">Hi</h2>' );

		$this->assertStringContainsString( 'class="wp-block-heading ml-has-text-gradient"', $updated );
		$this->assertStringContainsString( 'style="color:red;--ml-text-gradient:', $updated );
	}

	public function test_attribute_is_registered(): void {
		$args = $this->plugin->register_text_gradient_attribute( array( 'attributes' => array() ) );

		$this->assertSame( array( 'type' => 'string' ), $args['attributes']['mlTextGradient'] );
	}

	public function test_frontend_stylesheet_clips_the_gradient_to_the_text(): void {
		$this->plugin->enqueue_text_gradient_styles();

		$css = $GLOBALS['ml_test_inline_styles']['ml-gutenberg-text-gradient'] ?? '';

		$this->assertStringContainsString( '@supports', $css );
		$this->assertStringContainsString( 'background-image:var(--ml-text-gradient)', $css );
		$this->assertStringContainsString( '-webkit-background-clip:text', $css );
		$this->assertStringContainsString( 'background-clip:text', $css );
		$this->assertStringContainsString( '-webkit-text-fill-color:transparent', $css );
	}

	public function test_editor_stylesheet_is_scoped_to_block_wrappers(): void {
		$GLOBALS['ml_test_is_admin'] = true;

		$this->plugin->enqueue_text_gradient_editor_styles();

		$css = $GLOBALS['ml_test_inline_styles']['ml-gutenberg-text-gradient-editor'] ?? '';

		$this->assertStringContainsString( '[data-block].ml-has-text-gradient', $css );
	}

	public function test_editor_stylesheet_is_not_loaded_on_the_frontend(): void {
		$this->plugin->enqueue_text_gradient_editor_styles();

		$this->assertArrayNotHasKey( 'ml-gutenberg-text-gradient-editor', $GLOBALS['ml_test_inline_styles'] );
	}
}
