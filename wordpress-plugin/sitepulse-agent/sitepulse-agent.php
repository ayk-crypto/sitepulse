<?php
/**
 * Plugin Name: SitePulse Agent
 * Description: Connects WordPress websites to SitePulse by Onset Media for health monitoring.
 * Version: 0.1.0
 * Author: Onset Media
 */

if (!defined('ABSPATH')) {
    exit;
}

define('SITEPULSE_AGENT_VERSION', '0.1.0');
define('SITEPULSE_AGENT_API_URL_OPTION', 'sitepulse_agent_api_url');
define('SITEPULSE_AGENT_API_KEY_OPTION', 'sitepulse_agent_api_key');
define('SITEPULSE_AGENT_LAST_SYNC_OPTION', 'sitepulse_agent_last_sync');
define('SITEPULSE_AGENT_LAST_SYNC_STATUS_OPTION', 'sitepulse_agent_last_sync_status');
define('SITEPULSE_AGENT_CRON_HOOK', 'sitepulse_agent_cron_sync');
define('SITEPULSE_AGENT_CRON_SCHEDULE', 'sitepulse_agent_every_12_hours');

register_activation_hook(__FILE__, 'sitepulse_agent_activate');
register_deactivation_hook(__FILE__, 'sitepulse_agent_deactivate');
add_filter('cron_schedules', 'sitepulse_agent_add_cron_schedule');
add_action('admin_menu', 'sitepulse_agent_add_admin_menu');
add_action('admin_post_sitepulse_agent_save_settings', 'sitepulse_agent_save_settings');
add_action('admin_post_sitepulse_agent_sync_now', 'sitepulse_agent_sync_now');
add_action(SITEPULSE_AGENT_CRON_HOOK, 'sitepulse_agent_cron_sync');

function sitepulse_agent_add_cron_schedule($schedules)
{
    if (!isset($schedules[SITEPULSE_AGENT_CRON_SCHEDULE])) {
        $schedules[SITEPULSE_AGENT_CRON_SCHEDULE] = array(
            'interval' => 12 * HOUR_IN_SECONDS,
            'display' => __('Every 12 hours', 'sitepulse-agent'),
        );
    }

    return $schedules;
}

function sitepulse_agent_activate()
{
    if (!wp_next_scheduled(SITEPULSE_AGENT_CRON_HOOK)) {
        wp_schedule_event(time() + 300, SITEPULSE_AGENT_CRON_SCHEDULE, SITEPULSE_AGENT_CRON_HOOK);
    }
}

function sitepulse_agent_deactivate()
{
    wp_clear_scheduled_hook(SITEPULSE_AGENT_CRON_HOOK);
}

function sitepulse_agent_cron_sync()
{
    sitepulse_agent_send_sync();
}

function sitepulse_agent_add_admin_menu()
{
    add_menu_page(
        __('SitePulse Agent', 'sitepulse-agent'),
        __('SitePulse', 'sitepulse-agent'),
        'manage_options',
        'sitepulse-agent',
        'sitepulse_agent_render_settings_page',
        'dashicons-heart',
        80
    );
}

function sitepulse_agent_render_settings_page()
{
    if (!current_user_can('manage_options')) {
        wp_die(esc_html__('You do not have permission to access this page.', 'sitepulse-agent'));
    }

    $api_url = get_option(SITEPULSE_AGENT_API_URL_OPTION, 'http://localhost:4000');
    $api_key = get_option(SITEPULSE_AGENT_API_KEY_OPTION, '');
    $last_sync = get_option(SITEPULSE_AGENT_LAST_SYNC_OPTION, '');
    $last_status = get_option(SITEPULSE_AGENT_LAST_SYNC_STATUS_OPTION, 'Not synced yet.');
    $next_scheduled_sync = wp_next_scheduled(SITEPULSE_AGENT_CRON_HOOK);
    ?>
    <div class="wrap">
        <h1><?php echo esc_html__('SitePulse Agent', 'sitepulse-agent'); ?></h1>

        <?php sitepulse_agent_render_admin_notice(); ?>

        <h2><?php echo esc_html__('Connection Status', 'sitepulse-agent'); ?></h2>
        <p>
            <strong><?php echo esc_html__('Status:', 'sitepulse-agent'); ?></strong>
            <?php echo esc_html($last_status); ?>
        </p>
        <p>
            <strong><?php echo esc_html__('Last Sync:', 'sitepulse-agent'); ?></strong>
            <?php echo $last_sync ? esc_html($last_sync) : esc_html__('Never', 'sitepulse-agent'); ?>
        </p>
        <p>
            <strong><?php echo esc_html__('Automatic sync:', 'sitepulse-agent'); ?></strong>
            <?php echo esc_html__('every 12 hours', 'sitepulse-agent'); ?>
        </p>
        <p>
            <strong><?php echo esc_html__('Next scheduled sync:', 'sitepulse-agent'); ?></strong>
            <?php
            echo $next_scheduled_sync
                ? esc_html(date_i18n(get_option('date_format') . ' ' . get_option('time_format'), $next_scheduled_sync))
                : esc_html__('WP-Cron is enabled; next run will be scheduled on activation.', 'sitepulse-agent');
            ?>
        </p>

        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <input type="hidden" name="action" value="sitepulse_agent_save_settings">
            <?php wp_nonce_field('sitepulse_agent_save_settings', 'sitepulse_agent_settings_nonce'); ?>

            <table class="form-table" role="presentation">
                <tbody>
                    <tr>
                        <th scope="row">
                            <label for="sitepulse_agent_api_url">
                                <?php echo esc_html__('Dashboard API URL', 'sitepulse-agent'); ?>
                            </label>
                        </th>
                        <td>
                            <input
                                type="url"
                                class="regular-text"
                                id="sitepulse_agent_api_url"
                                name="sitepulse_agent_api_url"
                                value="<?php echo esc_attr($api_url); ?>"
                                placeholder="http://localhost:4000"
                                required
                            >
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="sitepulse_agent_api_key">
                                <?php echo esc_html__('API Key', 'sitepulse-agent'); ?>
                            </label>
                        </th>
                        <td>
                            <input
                                type="password"
                                class="regular-text"
                                id="sitepulse_agent_api_key"
                                name="sitepulse_agent_api_key"
                                value=""
                                placeholder="<?php echo $api_key ? esc_attr__('API key saved. Enter a new key to replace it.', 'sitepulse-agent') : esc_attr__('Enter API key', 'sitepulse-agent'); ?>"
                                autocomplete="new-password"
                            >
                        </td>
                    </tr>
                </tbody>
            </table>

            <?php submit_button(__('Save Settings', 'sitepulse-agent')); ?>
        </form>

        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <input type="hidden" name="action" value="sitepulse_agent_sync_now">
            <?php wp_nonce_field('sitepulse_agent_sync_now', 'sitepulse_agent_sync_nonce'); ?>
            <?php submit_button(__('Sync Now', 'sitepulse-agent'), 'secondary'); ?>
        </form>
    </div>
    <?php
}

function sitepulse_agent_render_admin_notice()
{
    if (!isset($_GET['sitepulse_message'])) {
        return;
    }

    $message = sanitize_text_field(wp_unslash($_GET['sitepulse_message']));
    $type = isset($_GET['sitepulse_type']) ? sanitize_key(wp_unslash($_GET['sitepulse_type'])) : 'success';
    $class = 'notice-success';

    if ('error' === $type) {
        $class = 'notice-error';
    }

    printf(
        '<div class="notice %1$s is-dismissible"><p>%2$s</p></div>',
        esc_attr($class),
        esc_html($message)
    );
}

function sitepulse_agent_save_settings()
{
    if (!current_user_can('manage_options')) {
        wp_die(esc_html__('You do not have permission to save these settings.', 'sitepulse-agent'));
    }

    check_admin_referer('sitepulse_agent_save_settings', 'sitepulse_agent_settings_nonce');

    $api_url = isset($_POST['sitepulse_agent_api_url']) && is_scalar($_POST['sitepulse_agent_api_url'])
        ? esc_url_raw(trim(wp_unslash($_POST['sitepulse_agent_api_url'])))
        : '';

    if ($api_url) {
        update_option(SITEPULSE_AGENT_API_URL_OPTION, untrailingslashit($api_url));
    }

    if (isset($_POST['sitepulse_agent_api_key']) && is_scalar($_POST['sitepulse_agent_api_key'])) {
        $api_key = sanitize_text_field(wp_unslash($_POST['sitepulse_agent_api_key']));

        if ('' !== $api_key) {
            update_option(SITEPULSE_AGENT_API_KEY_OPTION, $api_key);
        }
    }

    sitepulse_agent_redirect('Settings saved.', 'success');
}

function sitepulse_agent_sync_now()
{
    if (!current_user_can('manage_options')) {
        wp_die(esc_html__('You do not have permission to sync this site.', 'sitepulse-agent'));
    }

    check_admin_referer('sitepulse_agent_sync_now', 'sitepulse_agent_sync_nonce');

    $result = sitepulse_agent_send_sync();
    $type = !empty($result['success']) ? 'success' : 'error';

    sitepulse_agent_redirect($result['message'], $type);
}

function sitepulse_agent_send_sync()
{
    $api_url = untrailingslashit(get_option(SITEPULSE_AGENT_API_URL_OPTION, 'http://localhost:4000'));
    $api_key = get_option(SITEPULSE_AGENT_API_KEY_OPTION, '');

    if (!$api_url || !$api_key) {
        $message = 'Dashboard API URL and API key are required before syncing.';
        sitepulse_agent_store_sync_status($message);

        return array(
            'success' => false,
            'message' => $message,
        );
    }

    $response = wp_remote_post(
        $api_url . '/api/agent/sync',
        array(
            'timeout' => 20,
            'headers' => array(
                'Content-Type' => 'application/json',
                'x-sitepulse-api-key' => $api_key,
            ),
            'body' => wp_json_encode(sitepulse_agent_collect_data()),
        )
    );

    if (is_wp_error($response)) {
        $message = 'Sync failed: ' . $response->get_error_message();
        sitepulse_agent_store_sync_status($message);

        return array(
            'success' => false,
            'message' => $message,
        );
    }

    $status_code = wp_remote_retrieve_response_code($response);
    $body = json_decode(wp_remote_retrieve_body($response), true);

    if ($status_code < 200 || $status_code >= 300) {
        $api_message = isset($body['error']) ? sanitize_text_field($body['error']) : 'Unexpected API response.';
        $message = sprintf('Sync failed: %s', $api_message);
        sitepulse_agent_store_sync_status($message);

        return array(
            'success' => false,
            'message' => $message,
        );
    }

    $site_status = isset($body['status']) ? sanitize_text_field($body['status']) : 'received';
    $message = sprintf('Sync successful. Site status: %s.', $site_status);
    sitepulse_agent_store_sync_status($message);

    return array(
        'success' => true,
        'message' => $message,
    );
}

function sitepulse_agent_store_sync_status($message)
{
    update_option(SITEPULSE_AGENT_LAST_SYNC_OPTION, current_time('mysql'));
    update_option(SITEPULSE_AGENT_LAST_SYNC_STATUS_OPTION, sanitize_text_field($message));
}

function sitepulse_agent_collect_data()
{
    global $wp_version, $wpdb;

    require_once ABSPATH . 'wp-admin/includes/plugin.php';
    require_once ABSPATH . 'wp-admin/includes/update.php';

    wp_version_check();
    wp_update_plugins();
    wp_update_themes();

    $theme = wp_get_theme();
    $theme_updates = get_site_transient('update_themes');
    $plugin_updates = get_site_transient('update_plugins');
    $active_theme_stylesheet = $theme->get_stylesheet();
    $theme_update_available = is_object($theme_updates) && !empty($theme_updates->response[$active_theme_stylesheet]);
    $file_editor_enabled = !(defined('DISALLOW_FILE_EDIT') && DISALLOW_FILE_EDIT);

    return array(
        'site_url' => home_url(),
        'wordpress_version' => $wp_version,
        'php_version' => PHP_VERSION,
        'mysql_version' => is_object($wpdb) && method_exists($wpdb, 'db_version') ? $wpdb->db_version() : null,
        'active_theme' => array(
            'name' => $theme->get('Name'),
            'version' => $theme->get('Version'),
            'update_available' => $theme_update_available,
        ),
        'core_update_available' => sitepulse_agent_core_update_available(),
        'debug_mode' => defined('WP_DEBUG') && WP_DEBUG,
        'file_editor_enabled' => $file_editor_enabled,
        'plugins' => sitepulse_agent_collect_plugins($plugin_updates),
        'pages' => sitepulse_agent_collect_pages(),
    );
}

function sitepulse_agent_core_update_available()
{
    $updates = get_core_updates();

    if (!is_array($updates)) {
        return false;
    }

    foreach ($updates as $update) {
        if (isset($update->response) && 'upgrade' === $update->response) {
            return true;
        }
    }

    return false;
}

function sitepulse_agent_collect_plugins($plugin_updates)
{
    $installed_plugins = get_plugins();
    $plugins = array();

    foreach ($installed_plugins as $plugin_file => $plugin_data) {
        $update_data = is_object($plugin_updates) && !empty($plugin_updates->response[$plugin_file])
            ? $plugin_updates->response[$plugin_file]
            : null;

        $plugins[] = array(
            'name' => isset($plugin_data['Name']) ? $plugin_data['Name'] : $plugin_file,
            'slug' => $plugin_file,
            'version' => isset($plugin_data['Version']) ? $plugin_data['Version'] : null,
            'status' => is_plugin_active($plugin_file) ? 'active' : 'inactive',
            'latest_version' => $update_data && isset($update_data->new_version)
                ? $update_data->new_version
                : (isset($plugin_data['Version']) ? $plugin_data['Version'] : null),
            'update_available' => (bool) $update_data,
        );
    }

    return $plugins;
}

function sitepulse_agent_collect_pages()
{
    $pages = get_pages(
        array(
            'post_type' => 'page',
            'post_status' => 'publish',
            'sort_column' => 'post_modified',
            'sort_order' => 'DESC',
        )
    );
    $payload = array();

    foreach ($pages as $page) {
        $payload[] = array(
            'title' => get_the_title($page),
            'url' => get_permalink($page),
            'post_type' => get_post_type($page),
            'status' => get_post_status($page),
            'modified_at' => get_post_modified_time(DATE_ATOM, false, $page),
        );
    }

    return $payload;
}

function sitepulse_agent_redirect($message, $type)
{
    wp_safe_redirect(
        add_query_arg(
            array(
                'page' => 'sitepulse-agent',
                'sitepulse_message' => $message,
                'sitepulse_type' => $type,
            ),
            admin_url('admin.php')
        )
    );
    exit;
}
