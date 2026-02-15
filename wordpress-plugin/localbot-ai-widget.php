<?php
/**
 * Plugin Name: LocalBot AI Chat Widget
 * Plugin URI: https://localbot.ai
 * Description: Add your AI chatbot to any WordPress site – just enter your embed token.
 * Version: 1.0.0
 * Author: LocalBot AI
 * License: GPL v2 or later
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Add settings page under Settings menu
add_action('admin_menu', 'lba_add_admin_menu');
function lba_add_admin_menu() {
    add_options_page(
        'LocalBot AI Settings',
        'LocalBot AI',
        'manage_options',
        'localbot-ai',
        'lba_render_settings_page'
    );
}

// Register settings
add_action('admin_init', 'lba_register_settings');
function lba_register_settings() {
    register_setting('lba_options_group', 'lba_embed_token', array(
        'type'              => 'string',
        'sanitize_callback' => 'sanitize_text_field',
        'default'           => '',
    ));
    register_setting('lba_options_group', 'lba_widget_url', array(
        'type'              => 'string',
        'sanitize_callback' => 'esc_url_raw',
        'default'           => 'https://localbot.ai/widget.js',
    ));
}

// Render settings page
function lba_render_settings_page() {
    ?>
    <div class="wrap">
        <h1>LocalBot AI Chat Widget</h1>
        <p>Connect your LocalBot AI chatbot to this WordPress site. Paste your embed token from the
            <a href="https://localbot.ai" target="_blank" rel="noopener">LocalBot AI dashboard</a>.</p>
        <form method="post" action="options.php">
            <?php settings_fields('lba_options_group'); ?>
            <?php do_settings_sections('lba_options_group'); ?>
            <table class="form-table">
                <tr>
                    <th scope="row"><label for="lba_embed_token">Embed Token</label></th>
                    <td>
                        <input
                            type="text"
                            id="lba_embed_token"
                            name="lba_embed_token"
                            value="<?php echo esc_attr(get_option('lba_embed_token')); ?>"
                            class="regular-text"
                            placeholder="e.g. 4e9b9ef4-8d15-4434-bab1-c667eba4345a"
                        />
                        <p class="description">
                            Paste your chatbot's embed token from the LocalBot AI dashboard.<br />
                            Find it under <strong>Settings &rarr; Embed Code</strong> in your LocalBot account.
                        </p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="lba_widget_url">Widget Script URL</label></th>
                    <td>
                        <input
                            type="url"
                            id="lba_widget_url"
                            name="lba_widget_url"
                            value="<?php echo esc_attr(get_option('lba_widget_url', 'https://localbot.ai/widget.js')); ?>"
                            class="regular-text"
                            placeholder="https://localbot.ai/widget.js"
                        />
                        <p class="description">
                            The URL of the LocalBot AI widget script. Change only if instructed by support.
                        </p>
                    </td>
                </tr>
            </table>
            <?php submit_button('Save Settings'); ?>
        </form>
    </div>
    <?php
}

// Inject widget script into footer (public-facing pages only)
add_action('wp_footer', 'lba_inject_widget');
function lba_inject_widget() {
    // Don't inject in admin area
    if (is_admin()) {
        return;
    }

    $token = get_option('lba_embed_token');
    if (empty($token)) {
        return;
    }

    $script_url = get_option('lba_widget_url', 'https://localbot.ai/widget.js');
    if (empty($script_url)) {
        return;
    }
    ?>
    <script src="<?php echo esc_url($script_url); ?>" data-token="<?php echo esc_attr($token); ?>"></script>
    <?php
}
