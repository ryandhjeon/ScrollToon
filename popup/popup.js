document.addEventListener('DOMContentLoaded', () => {
  const defaultSpeedInput = document.getElementById('defaultSpeedInput');
  const speedVal = document.getElementById('speedVal');
  const middleClickToggle = document.getElementById('middleClickToggle');
  const rightClickClutch = document.getElementById('rightClickClutch');
  const wheelBraking = document.getElementById('wheelBraking');
  const doubleTapToggle = document.getElementById('doubleTapToggle');

  const keys = {
    defaultSpeed: 1.5,
    enableMiddleClickToggle: true,
    enableRightClickClutch: true,
    enableWheelBraking: true,
    enableDoubleTapToggle: true
  };

  chrome.storage.sync.get(keys, (stored) => {
    const s = stored || keys;
    defaultSpeedInput.value = s.defaultSpeed || 1.5;
    speedVal.textContent = parseFloat(defaultSpeedInput.value).toFixed(1) + 'x';
    middleClickToggle.checked = s.enableMiddleClickToggle !== false;
    rightClickClutch.checked = s.enableRightClickClutch !== false;
    wheelBraking.checked = s.enableWheelBraking !== false;
    doubleTapToggle.checked = s.enableDoubleTapToggle !== false;
  });

  defaultSpeedInput.addEventListener('input', () => {
    const val = parseFloat(defaultSpeedInput.value).toFixed(1);
    speedVal.textContent = val + 'x';
    chrome.storage.sync.set({ defaultSpeed: parseFloat(val) });
  });

  middleClickToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ enableMiddleClickToggle: middleClickToggle.checked });
  });

  rightClickClutch.addEventListener('change', () => {
    chrome.storage.sync.set({ enableRightClickClutch: rightClickClutch.checked });
  });

  wheelBraking.addEventListener('change', () => {
    chrome.storage.sync.set({ enableWheelBraking: wheelBraking.checked });
  });

  doubleTapToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ enableDoubleTapToggle: doubleTapToggle.checked });
  });
});
