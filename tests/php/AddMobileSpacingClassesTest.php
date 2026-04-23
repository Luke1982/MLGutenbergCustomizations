<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

final class AddMobileSpacingClassesTest extends TestCase {
	private ML_Gutenberg_Customizations $plugin;

	protected function setUp(): void {
		$this->plugin = new ML_Gutenberg_Customizations();
	}

	public function test_it_adds_space_around_class_for_default_breakpoint(): void {
		$block_content = '<div class="wp-block-group"></div>';
		$block         = array(
			'attrs' => array(
				'mlMobileJustifyContent' => 'space-around',
			),
		);

		$updated = $this->plugin->add_mobile_spacing_classes($block_content, $block);

		$this->assertStringContainsString('has-mobile-justify-space-around', $updated);
		$this->assertStringNotContainsString('@media(max-width:', $updated);
	}

	public function test_it_outputs_inline_space_around_rule_for_custom_breakpoint(): void {
		$block_content = '<div class="wp-block-group"></div>';
		$block         = array(
			'attrs' => array(
				'mlMobileJustifyContent' => 'space-around',
				'mlMobileBreakpoint'     => 800,
			),
		);

		$updated = $this->plugin->add_mobile_spacing_classes($block_content, $block);

		$this->assertStringContainsString('@media(max-width:800px)', $updated);
		$this->assertStringContainsString('justify-content:space-around !important', $updated);
		$this->assertStringNotContainsString('has-mobile-justify-space-around', $updated);
	}
}
