import { app, api } from './comfy/index.js';
import { commonPrefix } from './common.js';
import { MonitorUI } from './monitorUI.js';
import { Colors } from './styles.js';
import { convertNumberToPascalCase } from './utils.js';
import { NewMenuOptions } from './progressBarUIBase.js';

class CrystoolsMonitor {
  idExtensionName = 'Crystools.monitor';
  menuPrefix = commonPrefix;
  newMenu: NewMenuOptions = NewMenuOptions.Disabled;

  settingsRate: TMonitorSettings;
  monitorCPUElement: TMonitorSettings;
  monitorRAMElement: TMonitorSettings;
  monitorHDDElement: TMonitorSettings;
  settingsHDD: TMonitorSettings;
  monitorGPUSettings: TMonitorSettings[] = [];
  monitorVRAMSettings: TMonitorSettings[] = [];
  monitorTemperatureSettings: TMonitorSettings[] = [];

  monitorUI: MonitorUI;

  constructor() {
    window.addEventListener('resize', this.updateDisplay);
  }

  createSettingsRate = (): void => {
    this.settingsRate = {
      id: 'Crystools.RefreshRate',
      name: 'Refresh per second',
      category: ['Crystools', this.menuPrefix + ' Refresh Rate'],
      tooltip: 'This is the time (in seconds) between each update of the monitors, 0 means no refresh',
      type: 'slider',
      attrs: {
        min: 0,
        max: 2,
        step: 0.25,
      },
      defaultValue: .5,
      // @ts-ignore
      onChange: async(value: string): Promise<void> => {
        let valueNumber: number;

        try {
          valueNumber = parseFloat(value);
          if (isNaN(valueNumber)) {
            throw new Error('invalid value');
          }
        } catch (error) {
          console.error(error);
          return;
        }
        try {
          await this.updateServer({rate: valueNumber});
        } catch (error) {
          console.error(error);
          return;
        }

        const data = {
          cpu_utilization: 0,
          device: 'cpu',

          gpus: [
            {
              gpu_utilization: 0,
              gpu_temperature: 0,
              vram_total: 0,
              vram_used: 0,
              vram_used_percent: 0,
            },
          ],
          hdd_total: 0,
          hdd_used: 0,
          hdd_used_percent: 0,
          ram_total: 0,
          ram_used: 0,
          ram_used_percent: 0,
        };
        if (valueNumber === 0) {
          this.monitorUI.updateDisplay(data);
        }

        this.monitorUI?.updateAllAnimationDuration(valueNumber);
      },
    };
  };

  createSettingsCPU = (): void => {
    // CPU Variables
    this.monitorCPUElement = {
      id: 'Crystools.ShowCpu',
      name: 'CPU Usage',
      category: ['Crystools', this.menuPrefix + ' Hardware', 'Cpu'],
      type: 'boolean',
      label: 'CPU',
      symbol: '%',
      defaultValue: true,
      htmlMonitorRef: undefined,
      htmlMonitorSliderRef: undefined,
      htmlMonitorLabelRef: undefined,
      cssColor: Colors.CPU,
      // @ts-ignore
      onChange: async(value: boolean): Promise<void> => {
        this.updateWidget(this.monitorCPUElement);
        await this.updateServer({switchCPU: value});
      },
    };
  };

  createSettingsRAM = (): void => {
    // RAM Variables
    this.monitorRAMElement = {
      id: 'Crystools.ShowRam',
      name: 'RAM Used',
      category: ['Crystools', this.menuPrefix + ' Hardware', 'Ram'],
      type: 'boolean',
      label: 'RAM',
      symbol: '%',
      defaultValue: true,
      htmlMonitorRef: undefined,
      htmlMonitorSliderRef: undefined,
      htmlMonitorLabelRef: undefined,
      cssColor: Colors.RAM,
      // @ts-ignore
      onChange: async(value: boolean): Promise<void> => {
        this.updateWidget(this.monitorRAMElement);
        await this.updateServer({switchRAM: value});
      },
    };
  };

  createSettingsGPUUsage = (name: string, index: number, moreThanOneGPU: boolean): void => {
    if (name === undefined || index === undefined) {
      console.warn('getGPUsFromServer: name or index undefined', name, index);
      return;
    }

    let label = 'GPU ';
    label += moreThanOneGPU ? index : '';

    const monitorGPUNElement: TMonitorSettings = {
      id: 'Crystools.ShowGpuUsage' + convertNumberToPascalCase(index),
      name: ' Usage',
      category: ['Crystools', `${this.menuPrefix} Show GPU [${index}] ${name}`, 'Usage'],
      type: 'boolean',
      label,
      symbol: '%',
      title: `${index}: ${name}`,
      defaultValue: true,
      htmlMonitorRef: undefined,
      htmlMonitorSliderRef: undefined,
      htmlMonitorLabelRef: undefined,
      cssColor: Colors.GPU,
      // @ts-ignore
      onChange: async(value: boolean): Promise<void> => {
        this.updateWidget(monitorGPUNElement);
        void await this.updateServerGPU(index, {utilization: value});
      },
    };

    this.monitorGPUSettings[index] = monitorGPUNElement;
    app.ui.settings.addSetting(this.monitorGPUSettings[index]);
    this.monitorUI.createDOMGPUMonitor(this.monitorGPUSettings[index]);
  };

  createSettingsGPUVRAM = (name: string, index: number, moreThanOneGPU: boolean): void => {
    if (name === undefined || index === undefined) {
      console.warn('getGPUsFromServer: name or index undefined', name, index);
      return;
    }

    let label = 'VRAM ';
    label += moreThanOneGPU ? index : '';

    // GPU VRAM Variables
    const monitorVRAMNElement: TMonitorSettings = {
      id: 'Crystools.ShowGpuVram' + convertNumberToPascalCase(index),
      name: 'VRAM',
      category: ['Crystools', `${this.menuPrefix} Show GPU [${index}] ${name}`, 'VRAM'],
      type: 'boolean',
      label: label,
      symbol: '%',
      title: `${index}: ${name}`,
      defaultValue: true,
      htmlMonitorRef: undefined,
      htmlMonitorSliderRef: undefined,
      htmlMonitorLabelRef: undefined,
      cssColor: Colors.VRAM,
      // @ts-ignore
      onChange: async(value: boolean): Promise<void> => {
        this.updateWidget(monitorVRAMNElement);
        void await this.updateServerGPU(index, {vram: value});
      },
    };

    this.monitorVRAMSettings[index] = monitorVRAMNElement;
    app.ui.settings.addSetting(this.monitorVRAMSettings[index]);
    this.monitorUI.createDOMGPUMonitor(this.monitorVRAMSettings[index]);
  };

  createSettingsGPUTemp = (name: string, index: number, moreThanOneGPU: boolean): void => {
    if (name === undefined || index === undefined) {
      console.warn('getGPUsFromServer: name or index undefined', name, index);
      return;
    }

    let label = 'Temp ';
    label += moreThanOneGPU ? index : '';

    // GPU Temperature Variables
    const monitorTemperatureNElement: TMonitorSettings = {
      id: 'Crystools.ShowGpuTemperature' + convertNumberToPascalCase(index),
      name: 'Temperature',
      category: ['Crystools', `${this.menuPrefix} Show GPU [${index}] ${name}`, 'Temperature'],
      type: 'boolean',
      label: label,
      symbol: '°',
      title: `${index}: ${name}`,
      defaultValue: true,
      htmlMonitorRef: undefined,
      htmlMonitorSliderRef: undefined,
      htmlMonitorLabelRef: undefined,
      cssColor: Colors.TEMP_START,
      cssColorFinal: Colors.TEMP_END,
      // @ts-ignore
      onChange: async(value: boolean): Promise<void> => {
        this.updateWidget(monitorTemperatureNElement);
        void await this.updateServerGPU(index, {temperature: value});
      },
    };

    this.monitorTemperatureSettings[index] = monitorTemperatureNElement;
    app.ui.settings.addSetting(this.monitorTemperatureSettings[index]);
    this.monitorUI.createDOMGPUMonitor(this.monitorTemperatureSettings[index]);
  };

  createSettingsHDD = (): void => {
    // HDD Variables
    this.monitorHDDElement = {
      id: 'Crystools.ShowHdd',
      name: 'Show HDD Used',
      category: ['Crystools', this.menuPrefix + ' Show Hard Disk', 'Show'],
      type: 'boolean',
      label: 'HDD',
      symbol: '%',
      // tooltip: 'See Partition to show (HDD)',
      defaultValue: false,
      htmlMonitorRef: undefined,
      htmlMonitorSliderRef: undefined,
      htmlMonitorLabelRef: undefined,
      cssColor: Colors.DISK,
      // @ts-ignore
      onChange: async(value: boolean): Promise<void> => {
        this.updateWidget(this.monitorHDDElement);
        await this.updateServer({switchHDD: value});
      },
    };

    this.settingsHDD = {
      id: 'Crystools.WhichHdd',
      name: 'Partition to show',
      category: ['Crystools', this.menuPrefix + ' Show Hard Disk', 'Which'],
      type: 'combo',
      defaultValue: '/',
      data: [],
      // @ts-ignore bad definition from comfyUI: `options?: undefined;`??
      options: (value: string): any => {
        const which = app.ui.settings.getSettingValue(this.settingsHDD.id, this.settingsHDD.defaultValue);
        return this.settingsHDD.data.map((m: any) => ({
          value: m,
          text: m,
          selected: !value ? m === which : m === value,
        }));
      },
      // @ts-ignore
      onChange: async(value: string): Promise<void> => {
        await this.updateServer({whichHDD: value});
      },
    };
  };

  createSettings = (): void => {
    app.ui.settings.addSetting(this.settingsRate);
    app.ui.settings.addSetting(this.monitorRAMElement);
    app.ui.settings.addSetting(this.monitorCPUElement);

    void this.getHDDsFromServer().then((data: string[]): void => {
      this.settingsHDD.data = data;
      app.ui.settings.addSetting(this.settingsHDD);
    });
    app.ui.settings.addSetting(this.monitorHDDElement);

    void this.getGPUsFromServer().then((gpus: TGpuName[]): void => {
      let moreThanOneGPU = false;
      if (gpus.length > 1) {
        moreThanOneGPU = true;
      }

      gpus?.forEach(({name, index}) => {
        this.createSettingsGPUTemp(name, index, moreThanOneGPU);
        this.createSettingsGPUVRAM(name, index, moreThanOneGPU);
        this.createSettingsGPUUsage(name, index, moreThanOneGPU);
      });

      this.finishedLoad();
    });
  };

  finishedLoad = (): void => {
    this.monitorUI.orderMonitors();
    this.updateAllWidget();
    this.moveMonitor(this.newMenu);
  };

  updateDisplay = (): void => {
    const newMenu = app.ui.settings.getSettingValue('Comfy.UseNewMenu', 'Disabled');

    if (newMenu !== this.newMenu) {
      this.newMenu = newMenu;

      this.monitorUI.showFullSection(this.newMenu === NewMenuOptions.Disabled);
      if (this.monitorUI.showSection) {
        this.setup();
      }

      this.moveMonitor(this.newMenu);
    }

  };

  moveMonitor = (position: NewMenuOptions): void => {
    let parentElement: Element | null | undefined;

    switch (position) {
      case NewMenuOptions.Disabled:
        parentElement = document.getElementById('queue-button');
        break;
      case NewMenuOptions.Top:
      case NewMenuOptions.Bottom:
        parentElement = document.getElementsByClassName('comfyui-menu-push')[0];
        break;
    }

    if (parentElement && this.monitorUI.htmlRoot) {
      console.log('moveMonitor1', parentElement);
      console.log('moveMonitor2', this.monitorUI.htmlRoot);
      parentElement.insertAdjacentElement('afterend', this.monitorUI.htmlRoot);
    } else {
      console.error('Crystools: parentElement to move monitors not found!', parentElement);
    }

  };

  updateAllWidget = (): void => {
    this.updateWidget(this.monitorCPUElement);
    this.updateWidget(this.monitorRAMElement);
    this.updateWidget(this.monitorHDDElement);

    this.monitorGPUSettings.forEach((monitorSettings) => {
      monitorSettings && this.updateWidget(monitorSettings);
    });
    this.monitorVRAMSettings.forEach((monitorSettings) => {
      monitorSettings && this.updateWidget(monitorSettings);
    });
    this.monitorTemperatureSettings.forEach((monitorSettings) => {
      monitorSettings && this.updateWidget(monitorSettings);
    });
  };

  /**
   * for the settings menu
   * @param monitorSettings
   */
  updateWidget = (monitorSettings: TMonitorSettings): void => {
    const value = app.ui.settings.getSettingValue(monitorSettings.id, monitorSettings.defaultValue);
    if (monitorSettings.htmlMonitorRef) {
      monitorSettings.htmlMonitorRef.style.display = value ? 'flex' : 'none';
    }
  };

  updateServer = async(data: TStatsSettings): Promise<string> => {
    const resp = await api.fetchApi('/crystools/monitor', {
      method: 'PATCH',
      body: JSON.stringify(data),
      cache: 'no-store',
    });
    if (resp.status === 200) {
      return await resp.text();
    }
    throw new Error(resp.statusText);
  };

  updateServerGPU = async(index: number, data: TGpuSettings): Promise<string> => {
    const resp = await api.fetchApi(`/crystools/monitor/GPU/${index}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      cache: 'no-store',
    });
    if (resp.status === 200) {
      return await resp.text();
    }
    throw new Error(resp.statusText);
  };

  getHDDsFromServer = async(): Promise<string[]> => {
    return this.getDataFromServer('HDD');
  };

  getGPUsFromServer = async(): Promise<TGpuName[]> => {
    return this.getDataFromServer<TGpuName>('GPU');
  };

  getDataFromServer = async <T>(what: string): Promise<T[]> => {
    const resp = await api.fetchApi(`/crystools/monitor/${what}`, {
      method: 'GET',
      cache: 'no-store',
    });
    if (resp.status === 200) {
      return await resp.json();
    }
    throw new Error(resp.statusText);
  };

  setup = (): void => {
    if (this.monitorUI) {
      // this.monitorUIOld.render(0);
      return;
    }

    this.createSettingsRate();
    this.createSettingsCPU();
    this.createSettingsRAM();
    this.createSettingsHDD();
    this.createSettings();

    const currentRate =
      parseFloat(app.ui.settings.getSettingValue(this.settingsRate.id, this.settingsRate.defaultValue));

    this.newMenu = app.ui.settings.getSettingValue('Comfy.UseNewMenu', 'Disabled');
    this.monitorUI = new MonitorUI(
      this.monitorCPUElement,
      this.monitorRAMElement,
      this.monitorHDDElement,
      this.monitorGPUSettings,
      this.monitorVRAMSettings,
      this.monitorTemperatureSettings,
      currentRate,
      (this.newMenu === NewMenuOptions.Disabled),
    );

    this.updateDisplay();
    this.registerListeners();
  };

  registerListeners = (): void => {
    api.addEventListener('crystools.monitor', (event: CustomEvent) => {
      if (event?.detail === undefined) {
        return;
      }
      this.monitorUI.updateDisplay(event.detail);
    }, false);
  };
}

const crystoolsMonitor = new CrystoolsMonitor();
app.registerExtension({
  name: crystoolsMonitor.idExtensionName,
  setup: crystoolsMonitor.setup,
});
