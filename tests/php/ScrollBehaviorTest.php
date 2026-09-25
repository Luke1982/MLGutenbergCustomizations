<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

/**
 * Tests for the mlScrollBehavior attribute → data-ml-scroll attribute output.
 */
final class ScrollBehaviorTest extends TestCase {
	private ML_Gutenberg_Customizations $plugin;

	protected function setUp(): void {
		$this->plugin = new ML_Gutenberg_Customizations();
	}

	// ── Early-return guard ───────────────────────────────────────────────────

	public function test_no_output_when_disabled(): void {
		$block_content = '<div class="wp-block-group"></div>';
		$block         = array(
			'attrs' => array(
				'mlScrollBehavior' => array(
					'enabled' => false,
					'mode'    => 'offset',
					'offset'  => 200,
				),
			),
		);

		$updated = $this->plugin->apply_block_customizations( $block_content, $block );

		$this->assertSame( $block_content, $updated );
		$this->assertStringNotContainsString( 'data-ml-scroll', $updated );
	}

	public function test_no_output_when_scroll_behavior_absent(): void {
		$block_content = '<div class="wp-block-group"></div>';
		$block         = array( 'attrs' => array() );

		$updated = $this->plugin->apply_block_customizations( $block_content, $block );

		$this->assertSame( $block_content, $updated );
	}

	// ── Attribute presence ───────────────────────────────────────────────────

	public function test_enabled_offset_mode_outputs_data_attribute(): void {
		$block_content = '<div class="wp-block-group"></div>';
		$block         = array(
			'attrs' => array(
				'mlScrollBehavior' => array(
					'enabled'         => true,
					'mode'            => 'offset',
					'offset'          => 100,
					'hideOnExceed'    => true,
					'animation'       => 'fade',
					'enableOnMobile'  => true,
					'enableOnDesktop' => true,
					'directionHideOn' => 'down',
				),
			),
		);

		$updated = $this->plugin->apply_block_customizations( $block_content, $block );

		$this->assertStringContainsString( 'data-ml-scroll=', $updated );
	}

	// ── JSON payload contents ────────────────────────────────────────────────

	private function extractScrollData( string $html ): array {
		preg_match( '/data-ml-scroll="([^"]+)"/', $html, $matches );
		$this->assertNotEmpty( $matches[1], 'data-ml-scroll attribute not found.' );
		$decoded = json_decode( html_entity_decode( $matches[1] ), true );
		$this->assertIsArray( $decoded );
		return $decoded;
	}

	public function test_offset_mode_values_in_json(): void {
		$block_content = '<div class="wp-block-group"></div>';
		$block         = array(
			'attrs' => array(
				'mlScrollBehavior' => array(
					'enabled'         => true,
					'mode'            => 'offset',
					'offset'          => 300,
					'hideOnExceed'    => false,
					'animation'       => 'slide',
					'enableOnMobile'  => false,
					'enableOnDesktop' => true,
					'directionHideOn' => 'down',
				),
			),
		);

		$updated = $this->plugin->apply_block_customizations( $block_content, $block );
		$data    = $this->extractScrollData( $updated );

		$this->assertTrue( $data['enabled'] );
		$this->assertSame( 'offset', $data['mode'] );
		$this->assertSame( 300, $data['offset'] );
		$this->assertFalse( $data['hideOnExceed'] );
		$this->assertSame( 'slide', $data['animation'] );
		$this->assertFalse( $data['enableOnMobile'] );
		$this->assertTrue( $data['enableOnDesktop'] );
	}

	public function test_direction_mode_values_in_json(): void {
		$block_content = '<div class="wp-block-group"></div>';
		$block         = array(
			'attrs' => array(
				'mlScrollBehavior' => array(
					'enabled'         => true,
					'mode'            => 'direction',
					'offset'          => 50,
					'hideOnExceed'    => true,
					'animation'       => 'none',
					'enableOnMobile'  => true,
					'enableOnDesktop' => false,
					'directionHideOn' => 'up',
				),
			),
		);

		$updated = $this->plugin->apply_block_customizations( $block_content, $block );
		$data    = $this->extractScrollData( $updated );

		$this->assertSame( 'direction', $data['mode'] );
		$this->assertSame( 50, $data['offset'] );
		$this->assertSame( 'none', $data['animation'] );
		$this->assertFalse( $data['enableOnDesktop'] );
		$this->assertSame( 'up', $data['directionHideOn'] );
	}

	// ── Input sanitisation ───────────────────────────────────────────────────

	public function test_invalid_mode_falls_back_to_offset(): void {
		$block_content = '<div class="wp-block-group"></div>';
		$block         = array(
			'attrs' => array(
				'mlScrollBehavior' => array(
					'enabled'   => true,
					'mode'      => 'xss"><script>alert(1)</script>',
					'offset'    => 100,
					'animation' => 'fade',
				),
			),
		);

		$updated = $this->plugin->apply_block_customizations( $block_content, $block );
		$data    = $this->extractScrollData( $updated );

		$this->assertSame( 'offset', $data['mode'] );
	}

	public function test_invalid_animation_falls_back_to_fade(): void {
		$block_content = '<div class="wp-block-group"></div>';
		$block         = array(
			'attrs' => array(
				'mlScrollBehavior' => array(
					'enabled'   => true,
					'mode'      => 'offset',
					'offset'    => 100,
					'animation' => 'explode',
				),
			),
		);

		$updated = $this->plugin->apply_block_customizations( $block_content, $block );
		$data    = $this->extractScrollData( $updated );

		$this->assertSame( 'fade', $data['animation'] );
	}

	public function test_invalid_direction_falls_back_to_down(): void {
		$block_content = '<div class="wp-block-group"></div>';
		$block         = array(
			'attrs' => array(
				'mlScrollBehavior' => array(
					'enabled'         => true,
					'mode'            => 'direction',
					'offset'          => 100,
					'animation'       => 'fade',
					'directionHideOn' => 'sideways',
				),
			),
		);

		$updated = $this->plugin->apply_block_customizations( $block_content, $block );
		$data    = $this->extractScrollData( $updated );

		$this->assertSame( 'down', $data['directionHideOn'] );
	}

	public function test_negative_offset_is_clamped_to_zero(): void {
		$block_content = '<div class="wp-block-group"></div>';
		$block         = array(
			'attrs' => array(
				'mlScrollBehavior' => array(
					'enabled'   => true,
					'mode'      => 'offset',
					'offset'    => -500,
					'animation' => 'fade',
				),
			),
		);

		$updated = $this->plugin->apply_block_customizations( $block_content, $block );
		$data    = $this->extractScrollData( $updated );

		$this->assertSame( 0, $data['offset'] );
	}

	public function test_missing_optional_fields_get_safe_defaults(): void {
		$block_content = '<div class="wp-block-group"></div>';
		$block         = array(
			'attrs' => array(
				'mlScrollBehavior' => array(
					'enabled' => true,
					// All other keys intentionally omitted.
				),
			),
		);

		$updated = $this->plugin->apply_block_customizations( $block_content, $block );
		$data    = $this->extractScrollData( $updated );

		$this->assertSame( 'offset', $data['mode'] );
		$this->assertSame( 100, $data['offset'] );
		$this->assertTrue( $data['hideOnExceed'] );
		$this->assertSame( 'fade', $data['animation'] );
		$this->assertTrue( $data['enableOnMobile'] );
		$this->assertTrue( $data['enableOnDesktop'] );
		$this->assertSame( 'down', $data['directionHideOn'] );
	}

	// ── Coexistence with other features ─────────────────────────────────────

	public function test_scroll_behavior_coexists_with_mobile_padding(): void {
		$block_content = '<div class="wp-block-group"></div>';
		$block         = array(
			'attrs' => array(
				'mlMobilePadding'  => array( 'top' => '40' ),
				'mlScrollBehavior' => array(
					'enabled'   => true,
					'mode'      => 'offset',
					'offset'    => 80,
					'animation' => 'fade',
				),
			),
		);

		$updated = $this->plugin->apply_block_customizations( $block_content, $block );

		$this->assertStringContainsString( 'has-mobile-padding-top-40', $updated );
		$this->assertStringContainsString( 'data-ml-scroll=', $updated );
	}

	public function test_scroll_behavior_coexists_with_link_overlay(): void {
		$block_content = '<div class="wp-block-group"></div>';
		$block         = array(
			'attrs' => array(
				'mlLinkUrl'        => 'https://example.com',
				'mlScrollBehavior' => array(
					'enabled'   => true,
					'mode'      => 'offset',
					'offset'    => 100,
					'animation' => 'fade',
				),
			),
		);

		$updated = $this->plugin->apply_block_customizations( $block_content, $block );

		$this->assertStringContainsString( 'ml-block-link', $updated );
		$this->assertStringContainsString( 'data-ml-scroll=', $updated );
	}

	public function test_scroll_behavior_coexists_with_hidden_flag(): void {
		$block_content = '<div class="wp-block-group"></div>';
		$block         = array(
			'attrs' => array(
				'mlHidden'         => true,
				'mlScrollBehavior' => array(
					'enabled'   => true,
					'mode'      => 'offset',
					'offset'    => 100,
					'animation' => 'none',
				),
			),
		);

		$updated = $this->plugin->apply_block_customizations( $block_content, $block );

		$this->assertStringContainsString( 'display:none', $updated );
		$this->assertStringContainsString( 'data-ml-scroll=', $updated );
	}

	// ── data-ml-scroll is on the root element ────────────────────────────────

	public function test_data_attribute_is_on_root_element(): void {
		$block_content = '<div class="wp-block-group"><p>Content</p></div>';
		$block         = array(
			'attrs' => array(
				'mlScrollBehavior' => array(
					'enabled'   => true,
					'mode'      => 'offset',
					'offset'    => 100,
					'animation' => 'fade',
				),
			),
		);

		$updated = $this->plugin->apply_block_customizations( $block_content, $block );

		// The attribute must appear on the opening div, not inside a child element.
		$this->assertMatchesRegularExpression(
			'/^<div[^>]+data-ml-scroll=/',
			trim( preg_replace( '/^<style[^>]*>.*?<\/style>/s', '', $updated ) )
		);
	}
}
