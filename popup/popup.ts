/// <reference path="../common/Logger.ts" />
/// <reference path="../common/AppState.ts" />
/// <reference path="../common/AddonMessage.ts" />
/// <reference path="../common/ConfigManager.ts" />

// Pretend browser (WebExtensions) is chrome (there's a polyfill from Mozilla but it doesn't work well enough yet so this buys us time)
//TODO:c: Review before launch - maybe can switch to browser + polyfill? Promises (and Edge support) are sticking points at the moment.
declare const chrome: typeof browser;

let appState: AppState;
let keePopupLoadTime = Date.now();
let myPort: browser.runtime.Port;

function updateConnectionStatus () {
    if (appState.connected) {
        if (appState.KeePassDatabases.length > 1) {
            $("#connectionStatus").innerText = $STRF("loggedInMultiple_tip", [
                appState.KeePassDatabases.length.toString(),
                appState.KeePassDatabases[appState.ActiveKeePassDatabaseIndex].name
            ]);
        } else if (appState.KeePassDatabases.length == 1) {
            $("#connectionStatus").innerText = $STRF("loggedIn_tip", appState.KeePassDatabases[appState.ActiveKeePassDatabaseIndex].name);
        } else {
            $("#connectionStatus").innerText = $STR("notifyBarLaunchKeePass_label") + " " + $STR("notifyBarLoginToKeePassButton_tip");
        }
    } else {
        $("#connectionStatus").innerText = $STR("notifyBarLaunchKeePass_label") + " " + $STR("notifyBarLaunchKeePassButton_tip");
    }
}

function updateAppState (newState) {
    if (!appState) {
        //$("#debug").innerText = "Render time: " + (Date.now() - keePopupLoadTime);
        $("#main").classList.remove("hidden");
        $("#loading").classList.add("hidden");
    }

    appState = newState;
}

function updateNotifications () {
    const notificationContainer = $("#notifications");
    while (notificationContainer.hasChildNodes()) {
        notificationContainer.removeChild(notificationContainer.lastChild);
    }
    for (const notificationData of appState.notifications) {
        const notification = new KeeNotification(
            notificationData.name,
            notificationData.buttons,
            notificationData.id,
            notificationData.messages,
            notificationData.priority,
            notificationData.allowMultiple,
            myPort);
        notificationContainer.appendChild(notification.render());
    }
}

function startup () {
    KeeLog.debug("popup started");

    KeeLog.attachConfig(configManager.current);

    myPort = chrome.runtime.connect({ name: "browserPopup" });

    myPort.onMessage.addListener(function (m: AddonMessage) {
        KeeLog.debug("In browser popup script, received message from background script: ");
        updateAppState(m.appState);
        updateConnectionStatus();
        updateNotifications();
        if (appState.connected) {
            document.getElementById("generatePasswordLink").style.display = "block";
        } else {
            document.getElementById("generatePasswordLink").style.display = "none";
        }
    });

    document.getElementById("optionsLink").addEventListener("click", () => chrome.runtime.openOptionsPage() );
    document.getElementById("generatePasswordLink").addEventListener("click", () => myPort.postMessage({ action: "generatePassword" }) );

    KeeLog.info("popup ready");
}

// Load our config and start the page script once done
configManager.load(startup);
