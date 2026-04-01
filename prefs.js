import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

function fileExists(path) {
    return GLib.file_test(path, GLib.FileTest.EXISTS);
}

function isBackendInstalled() {
    return fileExists('/usr/local/bin/cpu-governor-dispatch') &&
           fileExists('/etc/systemd/system/cpu-governor.service');
}

function getBackendState() {
    if (!isBackendInstalled())
        return 'missing';

    try {
        const proc = Gio.Subprocess.new(
            ['systemctl', 'is-active', 'cpu-governor.service'],
            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
        );

        const [, stdout] = proc.communicate_utf8(null, null);
        const status = stdout.trim();

        if (status === 'active')
            return 'active';

        return 'inactive';
    } catch {
        return 'inactive';
    }
}
export default class CpuGovernorPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        this.initTranslations();

        const settings = this.getSettings('org.gnome.shell.extensions.cpu-governor');

        window.set_default_size(720, 680);

        const page = new Adw.PreferencesPage({
            title: this.gettext('CPU Governor'),
            icon_name: 'power-profile-balanced-symbolic',
        });

        // === Boot boost ===
        const bootBoostRow = new Adw.SwitchRow({
            title: this.gettext('Boot boost'),
            subtitle: this.gettext('Use Balanced briefly after login, then switch to Powersave'),
        });

        settings.bind(
            'boot-boost-enabled',
            bootBoostRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );

        const durationRow = new Adw.ActionRow({
            title: this.gettext('Boost duration'),
            subtitle: this.gettext('How long Balanced stays active after login'),
        });

        const durationSpin = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 600,
                step_increment: 1,
                page_increment: 10,
                value: settings.get_int('boot-boost-duration'),
            }),
            numeric: true,
            valign: Gtk.Align.CENTER,
        });

        durationSpin.connect('value-changed', () => {
            settings.set_int('boot-boost-duration', durationSpin.get_value_as_int());
        });

        durationRow.add_suffix(durationSpin);
        durationRow.activatable_widget = durationSpin;

        // === Hide GNOME tile ===
        const hidePowerTileRow = new Adw.SwitchRow({
            title: this.gettext('Hide Power Mode tile'),
            subtitle: this.gettext('Hide GNOME’s default Power Mode tile'),
        });

        settings.bind(
            'hide-power-profile-tile',
            hidePowerTileRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );

        // === Show panel info ===
        const showPanelInfoRow = new Adw.SwitchRow({
            title: this.gettext('Show panel info'),
            subtitle: this.gettext('Display CPU temperature and frequency on the top bar'),
        });

        settings.bind(
            'show-panel-info',
            showPanelInfoRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );

        // === Panel info mode ===
        const panelInfoModeRow = new Adw.ActionRow({
            title: this.gettext('Display mode'),
            subtitle: this.gettext('Choose what to show on the top bar'),
        });

        const panelInfoModeCombo = new Gtk.ComboBoxText({
            valign: Gtk.Align.CENTER,
        });

        panelInfoModeCombo.append('temperature', this.gettext('Temperature'));
        panelInfoModeCombo.append('frequency', this.gettext('Frequency'));
        panelInfoModeCombo.append('both', this.gettext('Both'));

        panelInfoModeCombo.set_active_id(settings.get_string('panel-info-mode'));

        panelInfoModeCombo.connect('changed', () => {
            settings.set_string('panel-info-mode', panelInfoModeCombo.get_active_id());
        });

        panelInfoModeRow.add_suffix(panelInfoModeCombo);
        panelInfoModeRow.activatable_widget = panelInfoModeCombo;

        // === Refresh interval ===
        const refreshIntervalRow = new Adw.ActionRow({
            title: this.gettext('Refresh interval'),
            subtitle: this.gettext('How often the panel info updates'),
        });

        const refreshIntervalSpin = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 60,
                step_increment: 1,
                page_increment: 5,
                value: settings.get_int('refresh-interval'),
            }),
            numeric: true,
            valign: Gtk.Align.CENTER,
        });

        refreshIntervalSpin.connect('value-changed', () => {
            settings.set_int('refresh-interval', refreshIntervalSpin.get_value_as_int());
        });

        refreshIntervalRow.add_suffix(refreshIntervalSpin);
        refreshIntervalRow.activatable_widget = refreshIntervalSpin;

        // === Panel position ===
        const positionRow = new Adw.ActionRow({
            title: this.gettext('Position'),
            subtitle: this.gettext('Where the panel info appears'),
        });

        const positionCombo = new Gtk.ComboBoxText({
            valign: Gtk.Align.CENTER,
        });

        positionCombo.append('left', this.gettext('Left'));
        positionCombo.append('center', this.gettext('Center'));
        positionCombo.append('right', this.gettext('Right'));

        positionCombo.set_active_id(settings.get_string('panel-position'));

        positionCombo.connect('changed', () => {
            settings.set_string('panel-position', positionCombo.get_active_id());
        });

        positionRow.add_suffix(positionCombo);
        positionRow.activatable_widget = positionCombo;

        // === Left padding ===
        const paddingLeftRow = new Adw.ActionRow({
            title: this.gettext('Left padding'),
            subtitle: this.gettext('Left spacing in pixels'),
        });

        const paddingLeftSpin = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 50,
                step_increment: 1,
                page_increment: 5,
                value: settings.get_int('panel-padding-left'),
            }),
            numeric: true,
            valign: Gtk.Align.CENTER,
        });

        paddingLeftSpin.connect('value-changed', () => {
            settings.set_int('panel-padding-left', paddingLeftSpin.get_value_as_int());
        });

        paddingLeftRow.add_suffix(paddingLeftSpin);
        paddingLeftRow.activatable_widget = paddingLeftSpin;

        // === Right padding ===
        const paddingRightRow = new Adw.ActionRow({
            title: this.gettext('Right padding'),
            subtitle: this.gettext('Right spacing in pixels'),
        });

        const paddingRightSpin = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 50,
                step_increment: 1,
                page_increment: 5,
                value: settings.get_int('panel-padding-right'),
            }),
            numeric: true,
            valign: Gtk.Align.CENTER,
        });

        paddingRightSpin.connect('value-changed', () => {
            settings.set_int('panel-padding-right', paddingRightSpin.get_value_as_int());
        });

        paddingRightRow.add_suffix(paddingRightSpin);
        paddingRightRow.activatable_widget = paddingRightSpin;

        // === System integration ===
        const installRow = new Adw.ActionRow({
            title: this.gettext('Backend integration'),
        });

        const integrationButton = new Gtk.Button({
            valign: Gtk.Align.CENTER,
        });

        installRow.add_suffix(integrationButton);
        installRow.activatable_widget = integrationButton;

        const updateIntegrationUI = () => {
            const state = getBackendState();

            if (state === 'active') {
                installRow.set_subtitle(this.gettext('Installed: CPU governor switching is enabled'));
                integrationButton.set_label(this.gettext('Uninstall'));
            } else if (state === 'inactive') {
                installRow.set_subtitle(this.gettext('Installed but not running: backend needs attention'));
                integrationButton.set_label(this.gettext('Uninstall'));
            } else {
                installRow.set_subtitle(this.gettext('Not installed: required to enable CPU governor switching'));
                integrationButton.set_label(this.gettext('Install'));
            }
        };

        integrationButton.connect('clicked', () => {
            const state = getBackendState();
            const wasInstalled = state !== 'missing';

            const scriptPath = wasInstalled
                ? `${this.path}/uninstall-system-helper.sh`
                : `${this.path}/install-system-helper.sh`;

            integrationButton.set_sensitive(false);

            try {
                const proc = Gio.Subprocess.new(
                    ['pkexec', scriptPath],
                    Gio.SubprocessFlags.NONE
                );

                proc.wait_check_async(null, (subprocess, result) => {
                    try {
                        subprocess.wait_check_finish(result);
                    } catch (e) {
                        log(`CPU GOV integration command failed: ${e}`);
                    }

                    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 700, () => {
                        updateIntegrationUI();
                        integrationButton.set_sensitive(true);
                        return GLib.SOURCE_REMOVE;
                    });
                });
            } catch (e) {
                log(`CPU GOV integration error: ${e}`);
                integrationButton.set_sensitive(true);
                updateIntegrationUI();
            }
        });

        updateIntegrationUI();

        // === Dynamic sensitivity ===
        const updatePanelRowsSensitivity = () => {
            const enabled = settings.get_boolean('show-panel-info');

            panelInfoModeRow.set_sensitive(enabled);
            refreshIntervalRow.set_sensitive(enabled);
            positionRow.set_sensitive(enabled);
            paddingLeftRow.set_sensitive(enabled);
            paddingRightRow.set_sensitive(enabled);
        };

        const updateBootRowsSensitivity = () => {
            durationRow.set_sensitive(settings.get_boolean('boot-boost-enabled'));
        };

        settings.connect('changed::show-panel-info', updatePanelRowsSensitivity);
        settings.connect('changed::boot-boost-enabled', updateBootRowsSensitivity);

        updatePanelRowsSensitivity();
        updateBootRowsSensitivity();

        // === GROUPS ===
        const startupGroup = new Adw.PreferencesGroup({
            title: this.gettext('Startup'),
            description: this.gettext('Behavior after login'),
        });

        startupGroup.add(bootBoostRow);
        startupGroup.add(durationRow);

        const panelGroup = new Adw.PreferencesGroup({
            title: this.gettext('Panel'),
            description: this.gettext('Top bar display settings'),
        });

        panelGroup.add(showPanelInfoRow);
        panelGroup.add(panelInfoModeRow);
        panelGroup.add(refreshIntervalRow);
        panelGroup.add(positionRow);
        panelGroup.add(paddingLeftRow);
        panelGroup.add(paddingRightRow);

        const systemGroup = new Adw.PreferencesGroup({
            title: this.gettext('System'),
            description: this.gettext('System-level integration'),
        });

        systemGroup.add(hidePowerTileRow);
        systemGroup.add(installRow);
        
        page.add(startupGroup);
        page.add(panelGroup);
        page.add(systemGroup);

        window.add(page);
    }
}
