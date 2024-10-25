const browseBtn = document.getElementById('browse-btn');
const addServerBtn = document.getElementById('add-server-btn');
const cancelServerBtn = document.getElementById('cancel-server-btn');
const serverFilesInput = document.getElementById('server-files');
const serverIconInput = document.getElementById('server-icon');
const previewIcon = document.getElementById('preview-icon');
const serverConfigForm = document.getElementById('server-config-form');
const instanceList = document.getElementById('instance-list');
const newServerForm = document.getElementById('new-server-form');
const serverDetailsPanel = document.getElementById('server-details-panel');
const editInstanceNameInput = document.getElementById('edit-instance-name');
const editServerPortInput = document.getElementById('edit-server-port');
const serverDetailsForm = document.getElementById('server-details-form');
const cancelDetailsBtn = document.getElementById('cancel-details-btn');
const activeBanner = document.getElementById('active-banner');
const activeGameTitle = document.getElementById('active-game');
const activeServerTitle = document.getElementById('active-server');

let serverConfigs = {};
let currentGame = 'minecraft';
let editingInstanceId = null;
let activeServer = null;

async function loadServerConfigs() {
  serverConfigs = await window.electronAPI.getServerConfigs();
  displayServerInstances();
  updateBanner();
}

function displayServerInstances() {
  instanceList.innerHTML = '';
  const instances = Object.values(serverConfigs).filter(config => config.game === currentGame);

  if (instances.length === 0) {
    instanceList.innerHTML = '<p>No servers configured.</p>';
  } else {
    instances.forEach(instance => {
      const listItem = document.createElement('div');
      listItem.classList.add('list-group-item', 'd-flex', 'align-items-center', 'mb-2', 'border', 'rounded');

      const icon = document.createElement('img');
      icon.src = instance.icon || 'assets/icons/minecraft.png';
      icon.alt = 'Server Icon';
      icon.style.width = '50px';
      icon.style.height = '50px';
      icon.style.objectFit = 'cover';
      icon.classList.add('me-2');

      const details = document.createElement('div');
      details.classList.add('flex-grow-1');
      details.innerHTML = `
        <strong>${instance.instanceName}</strong><br/>
        Location: ${instance.serverPath}
      `;

      const setActiveBtn = document.createElement('button');
      setActiveBtn.classList.add('btn', 'btn-primary', 'me-2');
      setActiveBtn.textContent = 'Set Active';
      setActiveBtn.addEventListener('click', () => setActiveInstance(instance.instanceId));

      const detailsBtn = document.createElement('button');
      detailsBtn.classList.add('btn', 'btn-info', 'me-2');
      detailsBtn.textContent = 'Details';
      detailsBtn.addEventListener('click', () => showServerDetails(instance.instanceId));

      const deleteBtn = document.createElement('button');
      deleteBtn.classList.add('btn', 'btn-danger');
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => deleteServerInstance(instance.instanceId));

      listItem.append(icon, details, setActiveBtn, detailsBtn, deleteBtn);
      instanceList.appendChild(listItem);
    });
  }
}

async function showServerDetails(instanceId) {
  editingInstanceId = instanceId;
  const config = serverConfigs[instanceId];

  if (config) {
    editInstanceNameInput.value = config.instanceName;
    const port = await window.electronAPI.readServerProperties(config.serverPath);
    editServerPortInput.value = port || '';
    serverDetailsPanel.style.display = 'block';
  }
}

async function setActiveInstance(instanceId) {
  Object.values(serverConfigs).forEach(config => {
    config.isActive = config.instanceId === instanceId;
  });

  const activeConfig = serverConfigs[instanceId];
  activeServer = activeConfig;

  const port = await window.electronAPI.readServerProperties(activeConfig.serverPath);
  activeConfig.port = port || 'N/A';

  const publicIP = await fetchPublicIP();

  const data = {
    serverName: activeConfig.instanceName,
    publicIP: publicIP,
    port: activeConfig.port,
    game: activeConfig.game,
    serverPath: activeConfig.serverPath,
  };

  const success = await window.electronAPI.saveActiveServerData(data);
  if (success) {
    updateBanner();
    alert('Active server set and JSON generated!');
  }
}

async function deleteServerInstance(instanceId) {
  if (confirm('Are you sure you want to delete this server?')) {
    delete serverConfigs[instanceId];
    await window.electronAPI.saveAllServerConfigs(serverConfigs);
    displayServerInstances();

    if (activeServer && activeServer.instanceId === instanceId) {
      activeServer = null;
      updateBanner();
    }

    alert('Server deleted successfully!');
  }
}

async function fetchPublicIP() {
  const response = await fetch('https://api.ipify.org?format=json');
  const data = await response.json();
  return data.ip;
}

function updateBanner() {
  if (activeServer) {
    activeGameTitle.textContent = `Active Game: ${activeServer.game}`;
    activeServerTitle.textContent = `Active Server: ${activeServer.instanceName}`;
    activeBanner.style.display = 'block';
  } else {
    activeBanner.style.display = 'none';
  }
}

serverDetailsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const instanceName = editInstanceNameInput.value;
  const port = editServerPortInput.value;
  const activeConfig = serverConfigs[editingInstanceId];

  if (activeConfig) {
    activeConfig.instanceName = instanceName;
    activeConfig.port = port;

    await window.electronAPI.updateServerProperties(activeConfig.serverPath, { 'server-port': port });
    await window.electronAPI.saveAllServerConfigs(serverConfigs);
    displayServerInstances();

    serverDetailsPanel.style.display = 'none';
    editingInstanceId = null;
    alert('Server details updated successfully!');
  }
});

serverIconInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    const savedPath = await window.electronAPI.copyIconToProgramData(file.path);
    if (savedPath) {
      previewIcon.src = `file://${savedPath}`;
    } else {
      alert('Failed to copy the icon to the program data directory.');
    }
  }
});

addServerBtn.addEventListener('click', () => {
  editingInstanceId = null;
  serverConfigForm.reset();
  previewIcon.src = 'assets/icons/minecraft.png';
  newServerForm.style.display = 'block';
});

cancelServerBtn.addEventListener('click', () => {
  newServerForm.style.display = 'none';
  serverConfigForm.reset();
  previewIcon.src = 'assets/icons/minecraft.png';
  editingInstanceId = null;
});

browseBtn.addEventListener('click', async () => {
  const serverPath = await window.electronAPI.selectServerFiles();
  if (serverPath) {
    serverFilesInput.value = serverPath;
  }
});

serverConfigForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const instanceName = document.getElementById('instance-name').value;
  const serverPath = serverFilesInput.value;
  const iconPath = previewIcon.src;

  if (Object.values(serverConfigs).some(config => config.instanceName === instanceName)) {
    alert('Server name must be unique.');
    return;
  }

  const instanceId = editingInstanceId || `${currentGame}-${Date.now()}`;
  const newServer = {
    instanceId,
    instanceName,
    game: currentGame,
    serverPath,
    icon: iconPath,
    settings: {},
  };

  serverConfigs[instanceId] = newServer;
  await window.electronAPI.saveAllServerConfigs(serverConfigs);
  displayServerInstances();

  newServerForm.style.display = 'none';
  editingInstanceId = null;
  serverConfigForm.reset();
  previewIcon.src = 'assets/icons/minecraft.png';
  alert('Server configuration saved successfully!');
});

cancelDetailsBtn.addEventListener('click', () => {
  serverDetailsPanel.style.display = 'none';
  editingInstanceId = null;
});

loadServerConfigs();
