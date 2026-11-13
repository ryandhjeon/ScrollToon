document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggleBtn');
  const toggleTitle = document.getElementById('toggleTitle');
  const toggleHint = document.getElementById('toggleHint');
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

  function updateActiveState(isActive) {
    if (isActive) {
      toggleBtn.classList.add('is-active');
      toggleTitle.textContent = 'Active on This Tab';
      toggleHint.textContent = 'Click to Turn Off (or Option + S)';
      headerDot.classList.remove('disabled');
    } else {
      toggleBtn.classList.remove('is-active');
      toggleTitle.textContent = 'Turn On on This Tab';
      toggleHint.textContent = 'Click to activate (or Option + S)';
      headerDot.classList.add('disabled');
    }
  }

  // Load saved preferences
  chrome.storage.sync.get(defaultKeys, (stored) => {
    const s = stored || defaultKeys;
    defaultSpeedInput.value = s.defaultSpeed || 1.5;
    speedVal.textContent = parseFloat(defaultSpeedInput.value).toFixed(1) + 'x';
    leftClickBrake.checked = s.enableLeftClickBrake !== false;
    middleClickToggle.checked = s.enableMiddleClickToggle !== false;
    doubleTapToggle.checked = s.enableDoubleTapToggle !== false;
  });

  // Check active tab state
  if (chrome.tabs && chrome.tabs.query) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getTabStatus' }, (res) => {
          if (chrome.runtime.lastError || !res) {
            updateActiveState(false);
            return;
          }
          updateActiveState(!!res.isMounted);
        });
      }
    });
  }

  // Big Turn On / Off Button
  toggleBtn.addEventListener('click', () => {
    if (chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleActive' }, (res) => {
            if (chrome.runtime.lastError || !res) return;
            updateActiveState(!!res.isMounted);
          });
        }
      });
    }
  });

  // Slider & Toggles
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
        if (chrome.tabs && chrome.tabs.query) {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0] && tabs[0].id) {
              chrome.tabs.sendMessage(tabs[0].id, { action: 'resetPosition' }, () => {
                if (chrome.runtime.lastError) {}
              });
            }
          });
        }
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
