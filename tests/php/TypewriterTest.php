<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

/**
 * Tests for the mlTypewriter attribute on core/paragraph.
 */
final class TypewriterTest extends TestCase {
	private ML_Gutenberg_Customizations $plugin;

	protected function setUp(): void {
		$this->plugin                     = new ML_Gutenberg_Customizations();
		$GLOBALS['ml_test_inline_styles'] = array();
	}

	private function render( array $typewriter, string $block_content = '<p class="wp-block-paragraph">Designers</p>' ): string {
		return $this->plugin->apply_typewriter(
			$block_content,
			array( 'attrs' => array( 'mlTypewriter' => $typewriter ) )
		);
	}

	private function data( string $html ): array {
		preg_match( '/data-ml-typewriter="([^"]+)"/', $html, $matches );
		$this->assertNotEmpty( $matches[1] ?? '', 'data-ml-typewriter not found in: ' . $html );
		$decoded = json_decode( html_entity_decode( $matches[1] ), true );
		$this->assertIsArray( $decoded );
		return $decoded;
	}

	// ── Early-return guards ──────────────────────────────────────────────────

	public function test_paragraph_without_setting_is_untouched(): void {
		$block_content = '<p class="wp-block-paragraph">Designers</p>';

		$this->assertSame(
			$block_content,
			$this->plugin->apply_typewriter( $block_content, array( 'attrs' => array() ) )
		);
	}

	public function test_disabled_typewriter_is_untouched(): void {
		$block_content = '<p class="wp-block-paragraph">Designers</p>';

		$this->assertSame(
			$block_content,
			$this->render( array( 'enabled' => false, 'texts' => array( 'Developers' ) ), $block_content )
		);
	}

	public function test_nothing_happens_without_a_second_text(): void {
		$block_content = '<p class="wp-block-paragraph">Designers</p>';

		$this->assertSame(
			$block_content,
			$this->render( array( 'enabled' => true, 'texts' => array( ' ', '' ) ), $block_content )
		);
	}

	// ── Output ───────────────────────────────────────────────────────────────

	public function test_cycling_paragraph_carries_its_texts(): void {
		$updated = $this->render(
			array(
				'enabled' => true,
				'texts'   => array( 'Developers', 'Makers' ),
			)
		);

		$this->assertStringContainsString( 'class="wp-block-paragraph ml-typewriter"', $updated );

		$data = $this->data( $updated );

		$this->assertSame( array( 'Developers', 'Makers' ), $data['texts'] );
		$this->assertSame( 2500, $data['interval'] );
		$this->assertSame( 60, $data['typeSpeed'] );
		$this->assertSame( 30, $data['backSpeed'] );
		$this->assertTrue( $data['cursor'] );
	}

	public function test_blank_texts_are_dropped_and_the_rest_trimmed(): void {
		$data = $this->data(
			$this->render(
				array(
					'enabled' => true,
					'texts'   => array( '  Developers  ', '', '   ', 'Makers' ),
				)
			)
		);

		$this->assertSame( array( 'Developers', 'Makers' ), $data['texts'] );
	}

	public function test_line_breaks_and_runs_of_whitespace_collapse(): void {
		$data = $this->data(
			$this->render(
				array(
					'enabled' => true,
					'texts'   => array( "Wie kunnen er\n  helpen?", "a\t\tb" ),
				)
			)
		);

		$this->assertSame( array( 'Wie kunnen er helpen?', 'a b' ), $data['texts'] );
	}

	public function test_timings_are_clamped(): void {
		$data = $this->data(
			$this->render(
				array(
					'enabled'   => true,
					'texts'     => array( 'Developers' ),
					'interval'  => 999999,
					'typeSpeed' => 0,
					'backSpeed' => 'fast',
				)
			)
		);

		$this->assertSame( 20000, $data['interval'] );
		$this->assertSame( 5, $data['typeSpeed'] );
		$this->assertSame( 30, $data['backSpeed'] );
	}

	public function test_the_cursor_can_be_switched_off(): void {
		$data = $this->data(
			$this->render(
				array(
					'enabled' => true,
					'texts'   => array( 'Developers' ),
					'cursor'  => false,
				)
			)
		);

		$this->assertFalse( $data['cursor'] );
	}

	public function test_existing_classes_are_preserved(): void {
		$updated = $this->render(
			array( 'enabled' => true, 'texts' => array( 'Developers' ) ),
			'<p class="wp-block-paragraph has-large-font-size">Designers</p>'
		);

		$this->assertStringContainsString( 'class="wp-block-paragraph has-large-font-size ml-typewriter"', $updated );
	}

	// ── Registration and styles ──────────────────────────────────────────────

	public function test_attribute_is_registered_on_paragraphs(): void {
		$args = $this->plugin->register_typewriter_attribute( array( 'attributes' => array() ), 'core/paragraph' );

		$this->assertSame( array( 'type' => 'object' ), $args['attributes']['mlTypewriter'] );
	}

	public function test_attribute_is_not_registered_on_other_blocks(): void {
		$args = $this->plugin->register_typewriter_attribute( array( 'attributes' => array() ), 'core/heading' );

		$this->assertArrayNotHasKey( 'mlTypewriter', $args['attributes'] );
	}

	public function test_cursor_styles_blink(): void {
		$this->plugin->enqueue_typewriter_styles();

		$css = $GLOBALS['ml_test_inline_styles']['ml-gutenberg-typewriter'] ?? '';

		$this->assertStringContainsString( '.ml-typewriter-cursor', $css );
		$this->assertStringContainsString( '@keyframes ml-typewriter-blink', $css );
		$this->assertStringContainsString( 'prefers-reduced-motion', $css );
	}
}
