import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import St from 'gi://St';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

const GOVERNOR_ICONS = {
    powersave: 'power-profile-power-saver-symbolic',
    schedutil: 'power-profile-balanced-symbolic',
    performance: 'power-profile-performance-symbolic',
};

const GOVERNOR_NAMES = {
    powersave: 'Powersave',
    schedutil: 'Balanced',
    performance: 'Performance',
};
const GOVERNOR_COLORS = {
    powersave: '#4caf50',
    schedutil: '#62a0ea',
    performance: '#f44336',
};

let settings = null;
let cpuTile = null;
let cpuIndicator = null;
let quickSettingsIcon = null;
let cpuInfoIndicator = null;
let cpuInfoLabel = null;
let refreshTimeoutId = null;
let bootBoostTimeoutId = null;
let settingsSignalIds = [];

function readFileAsync(path, callback) {
    try {
        const file = Gio.File.new_for_path(path);

        file.load_contents_async(null, (fileObj, res) => {
            try {
                const [ok, contents] = fileObj.load_contents_finish(res);

                if (!ok) {
                    callback(null);
                    return;
                }

                const text = new TextDecoder().decode(contents).trim();
                callback(text);

            } catch (e) {
                log(`readFileAsync error: ${e}`);
                callback(null);
            }
        });

    } catch (e) {
        log(`readFileAsync error: ${e}`);
        callback(null);
    }
}
const CpuGovernorTile = GObject.registerClass(
class CpuGovernorTile extends QuickSettings.QuickMenuToggle {
    _init(extension) {
        super._init({
            title: _('CPU'),
            subtitle: _('Governor'),
            iconName: 'power-profile-balanced-symbolic',
            toggleMode: false,
        });

        this._extension = extension;
        this._items = {};

        this.menu.setHeader(
            'power-profile-balanced-symbolic',
            _('CPU Governor'),
            _('Select mode')
        );

        const governors = [
            ['powersave', _('Powersave')],
            ['schedutil', _('Balanced')],
            ['performance', _('Performance')],
        ];

        for (const [gov, label] of governors) {
            const item = new PopupMenu.PopupMenuItem(label);
            item.connect('activate', () => {
                this._extension._setGovernor(gov);
            });

            this.menu.addMenuItem(item);
            this._items[gov] = item;
        }
    }

    updateSelection(activeGov) {
        for (const gov in this._items) {
            this._items[gov].setOrnament(
                gov === activeGov
                    ? PopupMenu.Ornament.DOT
                    : PopupMenu.Ornament.NONE
            );
        }
    }
});

export default class CpuGovernorExtension extends Extension {
    enable() {
        settings = this.getSettings();

        this._createQuickSettingsIcon();
        this._createTile();
        this._createCpuInfoIndicatorIfNeeded();
        this._connectSignals();
        this._updatePowerProfilesVisibility();
        this._runBootBoost();
        this._updateGovernor();
        this._updateCpuInfoLabel();
        this._startRefreshLoop();
        this._notifyIfBackendMissing();
    }

    disable() {
        this._disconnectSignals();
        this._stopRefreshLoop();
        this._stopBootBoost();
        this._restorePowerProfilesVisibility();
        this._destroyUi();
        if (this._notification && this._notifId) {
        try {
            this._notification.disconnect(this._notifId);
        } catch {}
        this._notifId = null;
        this._notification = null;
    }

        settings = null;
    }

    _connectSignals() {
        settingsSignalIds.push(
            settings.connect('changed::panel-position', () => {
                this._rebuildCpuInfoIndicator();
            })
        );

        settingsSignalIds.push(
            settings.connect('changed::refresh-interval', () => {
                this._restartRefreshLoop();
            })
        );

        settingsSignalIds.push(
            settings.connect('changed::show-panel-info', () => {
                this._updateCpuInfoVisibility();
            })
        );

        settingsSignalIds.push(
            settings.connect('changed::panel-padding-left', () => {
                this._updateCpuInfoPadding();
            })
        );

        settingsSignalIds.push(
            settings.connect('changed::panel-padding-right', () => {
                this._updateCpuInfoPadding();
            })
        );

        settingsSignalIds.push(
            settings.connect('changed::panel-info-mode', () => {
                this._updateCpuInfoLabel();
            })
        );

        settingsSignalIds.push(
            settings.connect('changed::hide-power-profile-tile', () => {
                this._updatePowerProfilesVisibility();
            })
        );
    }

    _disconnectSignals() {
        if (settings) {
            for (const id of settingsSignalIds) {
                try {
                    settings.disconnect(id);
                } catch {}
            }
        }

        settingsSignalIds = [];
    }

    _createQuickSettingsIcon() {
        try {
            quickSettingsIcon = new St.Icon({
                icon_name: 'power-profile-balanced-symbolic',
                style_class: 'system-status-icon',
            });

            Main.panel.statusArea.quickSettings._indicators.insert_child_at_index(quickSettingsIcon, 0);
        } catch (e) {
            log(`CPU GOV quick settings icon error: ${e}`);
        }
    }

    _createTile() {
        try {
            cpuIndicator = new QuickSettings.SystemIndicator();
            cpuTile = new CpuGovernorTile(this);

            cpuIndicator.quickSettingsItems.push(cpuTile);
            Main.panel.statusArea.quickSettings.addExternalIndicator(cpuIndicator);
        } catch (e) {
            log(`CPU GOV tile error: ${e}`);
        }
    }

    _createCpuInfoIndicatorIfNeeded() {
        if (!settings.get_boolean('show-panel-info'))
            return;

        this._createCpuInfoIndicator();
        this._updateCpuInfoLabel();
    }

    _createCpuInfoIndicator() {
        try {
            const position = settings.get_string('panel-position');
            const paddingLeft = settings.get_int('panel-padding-left');
            const paddingRight = settings.get_int('panel-padding-right');

            cpuInfoIndicator = new PanelMenu.Button(0.0, _('CPU Info'), false);

            cpuInfoLabel = new St.Label({
                text: '--',
                y_align: Clutter.ActorAlign.CENTER,
                style: `padding-left: ${paddingLeft}px; padding-right: ${paddingRight}px;`,
            });

            cpuInfoIndicator.add_child(cpuInfoLabel);

            let area = 'right';
            if (position === 'left')
                area = 'left';
            else if (position === 'center')
                area = 'center';

            Main.panel.addToStatusArea('cpu-info-indicator', cpuInfoIndicator, 1, area);
        } catch (e) {
            log(`CPU GOV panel indicator error: ${e}`);
        }
    }

    _rebuildCpuInfoIndicator() {
        if (cpuInfoIndicator) {
            cpuInfoIndicator.destroy();
            cpuInfoIndicator = null;
            cpuInfoLabel = null;
        }

        if (settings.get_boolean('show-panel-info')) {
            this._createCpuInfoIndicator();
            this._updateCpuInfoLabel();
        }
    }

    _updateCpuInfoVisibility() {
        if (!settings.get_boolean('show-panel-info')) {
            if (cpuInfoIndicator) {
                cpuInfoIndicator.destroy();
                cpuInfoIndicator = null;
                cpuInfoLabel = null;
            }
            return;
        }

        if (!cpuInfoIndicator)
            this._createCpuInfoIndicator();

        this._updateCpuInfoLabel();
    }

    _updateCpuInfoPadding() {
        if (!cpuInfoLabel)
            return;

        const paddingLeft = settings.get_int('panel-padding-left');
        const paddingRight = settings.get_int('panel-padding-right');

        cpuInfoLabel.set_style(
            `padding-left: ${paddingLeft}px; padding-right: ${paddingRight}px;`
        );
    }

_updateCpuInfoLabel() {
    let temp = null;
    let freq = null;

    let tempDone = false;
    let freqDone = false;

    const update = () => {
        if (!tempDone || !freqDone)
            return;

        let text = '';

        if (temp !== null && freq !== null)
            text = `${temp}°C | ${freq} GHz`;
        else if (temp !== null)
            text = `${temp}°C`;
        else if (freq !== null)
            text = `${freq} GHz`;

        if (cpuInfoLabel) {
            cpuInfoLabel.set_text(text);
        }
    };

    this._getCpuTemperature((t) => {
        temp = t;
        tempDone = true;
        update();
    });

    this._getCpuFrequency((f) => {
        freq = f;
        freqDone = true;
        update();
    });
}

_startRefreshLoop() {
    const interval = Math.max(1, settings.get_int('refresh-interval'));

    refreshTimeoutId = GLib.timeout_add_seconds(
        GLib.PRIORITY_DEFAULT,
        interval,
        () => {
            this._updateGovernor();
            this._updateCpuInfoLabel();
            return GLib.SOURCE_CONTINUE;
        }
    );
}
    _stopRefreshLoop() {
        if (refreshTimeoutId) {
            GLib.source_remove(refreshTimeoutId);
            refreshTimeoutId = null;
        }
    }

    _restartRefreshLoop() {
        this._stopRefreshLoop();
        this._startRefreshLoop();
    }

    _runBootBoost() {
        try {
            if (!settings.get_boolean('boot-boost-enabled'))
                return;

            this._setGovernor('schedutil');

            const duration = Math.max(1, settings.get_int('boot-boost-duration'));

            bootBoostTimeoutId = GLib.timeout_add_seconds(
                GLib.PRIORITY_DEFAULT,
                duration,
                () => {
                    this._setGovernor('powersave');
                    this._updateGovernor();
                    bootBoostTimeoutId = null;
                    return GLib.SOURCE_REMOVE;
                }
            );
        } catch (e) {
            log(`CPU GOV boot boost error: ${e}`);
        }
    }

    _stopBootBoost() {
        if (bootBoostTimeoutId) {
            GLib.source_remove(bootBoostTimeoutId);
            bootBoostTimeoutId = null;
        }
    }

 _setGovernor(governor) {
    try {
        if (!['powersave', 'schedutil', 'performance'].includes(governor))
            return;

        Gio.Subprocess.new(
            ['sh', '-c', `echo ${governor} > /var/lib/cpu-governor/request`],
            Gio.SubprocessFlags.NONE
        );

        this._updateGovernor();
    } catch (e) {
        log(`CPU GOV set governor error: ${e}`);
    }
}
    _updateGovernor() {
    readFileAsync('/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor', (governor) => {
        if (!governor)
            return;

        const iconName = GOVERNOR_ICONS[governor] || 'power-profile-balanced-symbolic';
        const iconColor = GOVERNOR_COLORS[governor] || '#ffffff';
        const label = GOVERNOR_NAMES[governor] || governor;

        if (cpuTile) {
            cpuTile.subtitle = label;
            cpuTile.gicon = Gio.icon_new_for_string(iconName);
            cpuTile.updateSelection(governor);
        }

        if (quickSettingsIcon) {
            quickSettingsIcon.gicon = Gio.icon_new_for_string(iconName);
            quickSettingsIcon.set_style(`color: ${iconColor};`);
        }

        this._updateCpuInfoLabel();
    });
}

    _getCpuTemperature(callback) {
    try {
        const hwmonDir = Gio.File.new_for_path('/sys/class/hwmon');
        const enumerator = hwmonDir.enumerate_children(
            'standard::name',
            Gio.FileQueryInfoFlags.NONE,
            null
        );

        let info;
        const dirs = [];

        while ((info = enumerator.next_file(null)) !== null) {
            dirs.push(info.get_name());
        }

        const checkNext = (index) => {
            if (index >= dirs.length) {
                callback(null);
                return;
            }

            const dirName = dirs[index];
            const basePath = `/sys/class/hwmon/${dirName}`;

            readFileAsync(`${basePath}/name`, (sensorName) => {
                if (sensorName !== 'k10temp' && sensorName !== 'coretemp') {
                    checkNext(index + 1);
                    return;
                }

                readFileAsync(`${basePath}/temp1_input`, (temp) => {
                    if (!temp) {
                        checkNext(index + 1);
                        return;
                    }

                    const value = parseInt(temp, 10);
                    if (!Number.isNaN(value) && value > 0) {
                        callback(Math.round(value / 1000));
                    } else {
                        checkNext(index + 1);
                    }
                });
            });
        };

        checkNext(0);

    } catch (e) {
        log(`CPU GOV temp error: ${e}`);
        callback(null);
    }
    
}

    _getCpuFrequency(callback) {

    readFileAsync('/sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq', (freq) => {
    log(`FREQ READ: ${freq}`);
        if (!freq) {
            callback(null);
            return;
        }

        const value = parseInt(freq, 10);
        if (!Number.isNaN(value) && value > 0) {
            callback((value / 1000000).toFixed(2));
        } else {
            callback(null);
        }
    });
}
    _updatePowerProfilesVisibility() {
        try {
            const shouldHide = settings.get_boolean('hide-power-profile-tile');
            const powerProfiles = Main.panel.statusArea.quickSettings?._powerProfiles;

            if (powerProfiles?.quickSettingsItems?.[0])
                powerProfiles.quickSettingsItems[0].visible = !shouldHide;
        } catch (e) {
            log(`CPU GOV power tile visibility error: ${e}`);
        }
    }

    _restorePowerProfilesVisibility() {
        try {
            const powerProfiles = Main.panel.statusArea.quickSettings?._powerProfiles;

            if (powerProfiles?.quickSettingsItems?.[0])
                powerProfiles.quickSettingsItems[0].visible = true;
        } catch (e) {
            log(`CPU GOV restore power tile error: ${e}`);
        }
    }

    _notifyIfBackendMissing() {
    try {
        const installed =
            GLib.file_test('/usr/local/bin/cpu-governor-dispatch', GLib.FileTest.EXISTS) &&
            GLib.file_test('/etc/systemd/system/cpu-governor.service', GLib.FileTest.EXISTS);

        if (installed)
            return;

        const source = new MessageTray.Source({
            title: _('CPU Governor'),
            iconName: 'power-profile-balanced-symbolic',
        });

        Main.messageTray.add(source);

        const notification = new MessageTray.Notification({
            source,
            title: _('CPU Governor'),
            body: _('Backend not installed. Click here to open settings.'),
        });

        notification.addAction(_('Open Settings'), () => {
            this.openPreferences();
        });
        this._notifId = notification.connect('activated', () => {
            this.openPreferences();
        });
            this._notification = notification;
        source.addNotification(notification);
    } catch (e) {
        log(`CPU GOV backend notification error: ${e}`);
    }
}

    _destroyUi() {
        if (quickSettingsIcon) {
            quickSettingsIcon.destroy();
            quickSettingsIcon = null;
        }

        if (cpuTile) {
            cpuTile.destroy();
            cpuTile = null;
        }

        if (cpuIndicator) {
            cpuIndicator.destroy();
            cpuIndicator = null;
        }

        if (cpuInfoIndicator) {
            cpuInfoIndicator.destroy();
            cpuInfoIndicator = null;
            cpuInfoLabel = null;
        }
    }
}
