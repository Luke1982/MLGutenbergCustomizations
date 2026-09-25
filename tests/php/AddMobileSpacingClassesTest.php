<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

final class AddMobileSpacingClassesTest extends TestCase {
	private ML_Gutenberg_Customizations $plugin;

	protected function setUp(): void {
		$this->plugin = new ML_Gutenberg_Customizations();
	}

	// ── Justify content ──────────────────────────────────────────────────────

	public function test_it_adds_space_around_class_for_default_breakpoint(): void {
		$block_content = '<div class="wp-block-group"></div>';
		$block         = array(
			'attrs' => array(
				'mlMobileJustifyContent' => 'space-around',
			),
		);

		$updated = $this->plugin->apply_block_customizations( $block_content, $block );

		$this->assertStringContainsString( 'has-mobile-justify-space-around', $updated );
		$this->assertStringNotContainsString( '@media(max-width:', $updated );
	}

	public function test_it_outputs_inline_space_around_rule_for_custom_breakpoint(): void {
		$block_content = '<div class="wp-block-group"></div>';
		$block         = array(
			'attrs' => array(
				'mlMobileJustifyContent' => 'space-around',
				'mlMobileBreakpoint'     => 800,
			),
		);

		$updated = $this->plugin->apply_block_customizations( $block_content, $block );

		$this->assertStringContainsString( '@media(max-width:800px)', $updated );
		$this->assertStringContainsString( 'justify-content:space-around !important', $updated );
		$this->assertStringNotContainsString( 'has-mobile-justify-space-around', $updated );
	}

	// ── Visibility: desktop-only (hidden on mobile) ──────────────────────────

	public function test_desktop_only_outputs_media_query_with_display_none(): void {
		$block_content = '<div class="wp-block-group"></div>';
		$block         = array(
			'attrs' => array(
				'mlVisibility' => 'desktop-only',
			),
		);

		$updated = $this->plugin->apply_block_customizations( $block_content, $block );

		$this->assertStringContainsString( 'display:none !important', $updated );
		$this->assertStringContainsString( '@media(max-width:650px)', $updated );
	}

	public function test_desktop_only_with_custom_breakpoint_uses_custom_bp(): void {
		$block_content = '<div class="wp-block-group"></div>';
		$block         = array(
			'attrs' => array(
				'mlVisibility'       => 'desktop-only',
				'mlMobileBreakpoint' => 480,
			),
		);

		$updated = $this->plugin->apply_block_customizations( $block_content, $block );

		$this->assertStringContainsString( 'display:none !important', $updated );
		$this->assertStringContainsString( '@media(max-width:480px)', $updated );
		$this->assertStringNotContainsString( '@media(max-width:650px)', $updated );
	}

	// ── Visibility: mobile-only (hidden on desktop) ──────────────────────────

	public function test_mobile_only_hides_on_desktop_and_shows_on_mobile(): void {
		$block_content = '<div class="wp-block-group"></div>';
		$block         = array(
			'attrs' => array(
				'mlVisibility' => 'mobile-only',
			),
		);

		$updated = $this->plugin->apply_block_customizations( $block_content, $block );

		// Scoped class must hide unconditionally…
		$this->assertMatchesRegularExpression( '/\.ml-mobile-[a-f0-9]+\{display:none !important\}/', $updated );
		// …and reveal below the breakpoint.
		$this->assertStringContainsString( 'display:revert !important', $updated );
		$this->assertStringContainsString( '@media(max-width:650px)', $updated );
	}

	public function test_mobile_only_with_custom_breakpoint_uses_custom_bp(): void {
		$block_content = '<div class="wp-block-group"></div>';
		$block         = array(
			'attrs' => array(
				'mlVisibility'       => 'mobile-only',
				'mlMobileBreakpoint' => 900,
			),
		);

		$updated = $this->plugin->apply_block_customizations( $block_content, $block );

		$this->assertStringContainsString( 'display:revert !important', $updated );
		$this->assertStringContainsString( '@media(max-width:900px)', $updated );
		$this->assertStringNotContainsString( '@media(max-width:650px)', $updated );
	}

	// ── Visibility: all (default — no visibility CSS emitted) ────────────────

	public function test_all_visibility_emits_no_display_rules(): void {
		$block_content = '<div class="wp-block-group"></div>';
		$block         = array(
			'attrs' => array(
				'mlVisibility' => 'all',
			),
		);

		$updated = $this->plugin->apply_block_customizations( $block_content, $block );

		$this->assertSame( $block_content, $updated );
	}

	// ── Global hidden (mlHidden) ─────────────────────────────────────────────

	public function test_hidden_applies_display_none_inline(): void {
		$block_content = '<div class="wp-block-group"></div>';
		$block         = array(
			'attrs' => array(
				'mlHidden' => true,
			),
		);

		$updated = $this->plugin->apply_block_customizations( $block_content, $block );

		$this->assertStringContainsString( 'display:none', $updated );
		// Should be inline style, not a @media rule.
		$this->assertStringNotContainsString( '@media', $updated );
	}
}
