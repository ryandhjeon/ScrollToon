document.addEventListener('DOMContentLoaded', () => {
  const powerToggle = document.getElementById('powerToggle');
  const powerLabel = document.getElementById('powerLabel');
  const headerDot = document.getElementById('headerDot');
  const defaultSpeedInput = document.getElementById('defaultSpeedInput');
  const speedVal = document.getElementById('speedVal');
  const leftClickBrake = document.getElementById('leftClickBrake');
  const middleClickToggle = document.getElementById('middleClickToggle');
  const doubleTapToggle = document.getElementById('doubleTapToggle');
  const resetPositionBtn = document.getElementById('resetPositionBtn');

  const defaultKeys = {
    defaultSpeed: 1.5,
    enableLeftClickBrake: true,
    enableMiddleClickToggle: true,
    enableDoubleTapToggle: true
  };

  function updatePowerUI(isOn) {
    powerToggle.checked = isOn;
    if (isOn) {
      powerLabel.textContent = 'ON';
      powerLabel.classList.add('is-on');
      headerDot.classList.remove('disabled');
    } else {
      powerLabel.textContent = 'OFF';
      powerLabel.classList.remove('is-on');
      headerDot.classList.add('disabled');
    }
  }

  // Load preferences
  chrome.storage.sync.get(defaultKeys, (stored) => {
    const s = stored || defaultKeys;
    defaultSpeedInput.value = s.defaultSpeed || 1.5;
    speedVal.textContent = parseFloat(defaultSpeedInput.value).toFixed(1) + 'x';
    leftClickBrake.checked = s.enableLeftClickBrake !== false;
    middleClickToggle.checked = s.enableMiddleClickToggle !== false;
    doubleTapToggle.checked = s.enableDoubleTapToggle !== false;
  });

  // Query tab status
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs[0] || !tabs[0].id) {
      updatePowerUI(false);
      return;
    }

    const tabId = tabs[0].id;
    chrome.tabs.sendMessage(tabId, { action: 'getTabStatus' }, (res) => {
      if (chrome.runtime.lastError || !res) {
        updatePowerUI(false);
        return;
      }
      updatePowerUI(!!res.isMounted);
    });
  });

  // Master Power Switch
  powerToggle.addEventListener('change', () => {
    const targetState = powerToggle.checked;
    updatePowerUI(targetState);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0] || !tabs[0].id) return;
      const tabId = tabs[0].id;

      // Try sending message directly
      chrome.tabs.sendMessage(tabId, { action: 'setActive', enable: targetState }, (res) => {
        if (chrome.runtime.lastError) {
          // If receiving end does not exist (tab was opened before extension was reloaded),
          // dynamically inject content scripts via scripting API
          if (chrome.scripting && chrome.scripting.executeScript) {
            chrome.scripting.executeScript({
              target: { tabId: tabId },
              files: [
                'src/preloader.js',
                'src/scroller.js',
                'src/clutch.js',
                'src/island.js',
                'src/content.js'
              ]
            }, () => {
              if (chrome.runtime.lastError) {
                console.warn('ScrollToon injection note:', chrome.runtime.lastError.message);
                return;
              }
              // Once injected, tell it to activate
              setTimeout(() => {
                chrome.tabs.sendMessage(tabId, { action: 'setActive', enable: targetState }, (res2) => {
                  updatePowerUI(res2 ? !!res2.isMounted : targetState);
                });
              }, 60);
            });
          }
          return;
        }

        if (res) {
          updatePowerUI(!!res.isMounted);
        }
      });
    });
  });

  // Sliders & Toggles
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

  // Reset Position Button
  if (resetPositionBtn) {
    resetPositionBtn.addEventListener('click', () => {
      chrome.storage.sync.remove('islandPosition', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs[0] && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'resetPosition' }, () => {
              if (chrome.runtime.lastError) {}
            });
          }
        });
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
