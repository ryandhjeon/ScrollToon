document.addEventListener('DOMContentLoaded', () => {
  const popupContainer = document.getElementById('popupContainer');
  const masterEnabled = document.getElementById('masterEnabled');
  const statusPill = document.getElementById('statusPill');
  const headerDot = document.getElementById('headerDot');
  const autoDetectOnly = document.getElementById('autoDetectOnly');
  const defaultSpeedInput = document.getElementById('defaultSpeedInput');
  const speedVal = document.getElementById('speedVal');
  const leftClickBrake = document.getElementById('leftClickBrake');
  const middleClickToggle = document.getElementById('middleClickToggle');
  const doubleTapToggle = document.getElementById('doubleTapToggle');
  const toggleCurrentTabBtn = document.getElementById('toggleCurrentTabBtn');
  const tabStateIndicator = document.getElementById('tabStateIndicator');
  const resetPositionBtn = document.getElementById('resetPositionBtn');

  const defaultKeys = {
    enabled: true,
    autoDetectOnly: true,
    defaultSpeed: 1.5,
    enableLeftClickBrake: true,
    enableMiddleClickToggle: true,
    enableDoubleTapToggle: true
  };

  function updatePowerUI(isEnabled) {
    masterEnabled.checked = isEnabled;
    if (isEnabled) {
      statusPill.textContent = 'ON';
      statusPill.classList.remove('disabled');
      headerDot.classList.remove('disabled');
      popupContainer.classList.remove('is-disabled');
    } else {
      statusPill.textContent = 'OFF';
      statusPill.classList.add('disabled');
      headerDot.classList.add('disabled');
      popupContainer.classList.add('is-disabled');
    }
  }

  function broadcastToTabs(message) {
    if (chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({}, (tabs) => {
        if (tabs && tabs.length) {
          tabs.forEach((tab) => {
            if (tab.id) {
              chrome.tabs.sendMessage(tab.id, message, () => {
                if (chrome.runtime.lastError) {
                  // Ignore inactive or un-injected tabs
                }
              });
            }
          });
        }
      });
    }
  }

  // Load preferences from sync storage
  chrome.storage.sync.get(defaultKeys, (stored) => {
    const s = stored || defaultKeys;
    const isEnabled = s.enabled !== false;
    updatePowerUI(isEnabled);

    autoDetectOnly.checked = s.autoDetectOnly !== false;
    defaultSpeedInput.value = s.defaultSpeed || 1.5;
    speedVal.textContent = parseFloat(defaultSpeedInput.value).toFixed(1) + 'x';
    leftClickBrake.checked = s.enableLeftClickBrake !== false;
    middleClickToggle.checked = s.enableMiddleClickToggle !== false;
    doubleTapToggle.checked = s.enableDoubleTapToggle !== false;
  });

  // Query active tab status
  if (chrome.tabs && chrome.tabs.query) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getTabStatus' }, (res) => {
          if (chrome.runtime.lastError || !res) {
            tabStateIndicator.textContent = 'Inactive';
            return;
          }
          if (res.isMounted) {
            tabStateIndicator.textContent = 'Visible';
            toggleCurrentTabBtn.classList.add('success');
          } else {
            tabStateIndicator.textContent = res.isReader ? 'Reader Ready' : 'Hidden';
            toggleCurrentTabBtn.classList.remove('success');
          }
        });
      }
    });
  }

  // Master Power Switch
  masterEnabled.addEventListener('change', () => {
    const enabled = masterEnabled.checked;
    updatePowerUI(enabled);
    chrome.storage.sync.set({ enabled });
    broadcastToTabs({ action: 'setEnabled', enabled });
  });

  // Only on Webtoon Readers toggle
  autoDetectOnly.addEventListener('change', () => {
    const isOnly = autoDetectOnly.checked;
    chrome.storage.sync.set({ autoDetectOnly: isOnly });
    broadcastToTabs({ action: 'setAutoDetectOnly', autoDetectOnly: isOnly });
  });

  // Speed slider
  defaultSpeedInput.addEventListener('input', () => {
    const val = parseFloat(defaultSpeedInput.value).toFixed(1);
    speedVal.textContent = val + 'x';
    chrome.storage.sync.set({ defaultSpeed: parseFloat(val) });
  });

  leftClickBrake.addEventListener('change', () => {
    chrome.storage.sync.set({ enableLeftClickBrake: leftClickBrake.checked });
  });

  middleClickToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ enableMiddleClickToggle: middleClickToggle.checked });
  });

  doubleTapToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ enableDoubleTapToggle: doubleTapToggle.checked });
  });

  // Toggle tool on current tab button
  if (toggleCurrentTabBtn) {
    toggleCurrentTabBtn.addEventListener('click', () => {
      if (chrome.tabs && chrome.tabs.query) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs[0] && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleCurrentTab' }, (res) => {
              if (chrome.runtime.lastError || !res) return;
              if (res.isMounted) {
                tabStateIndicator.textContent = 'Visible';
                toggleCurrentTabBtn.classList.add('success');
              } else {
                tabStateIndicator.textContent = 'Hidden';
                toggleCurrentTabBtn.classList.remove('success');
              }
            });
          }
        });
      }
    });
  }

  // Reset Position Button
  if (resetPositionBtn) {
    resetPositionBtn.addEventListener('click', () => {
      chrome.storage.sync.remove('islandPosition', () => {
        broadcastToTabs({ action: 'resetPosition' });
      });

      const originalHtml = resetPositionBtn.innerHTML;
      resetPositionBtn.textContent = '✓ Centered!';
      resetPositionBtn.classList.add('success');
      setTimeout(() => {
        resetPositionBtn.innerHTML = originalHtml;
        resetPositionBtn.classList.remove('success');
      }, 1200);
    });
  }
});
