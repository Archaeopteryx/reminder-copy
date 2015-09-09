Components.utils.import("resource://gre/modules/Services.jsm");

function startup(data,reason)
{
  corelitocl.forEachOpenWindow(corelitocl.loadIntoWindow);
  Services.wm.addListener(WindowListener);
}

function shutdown(data,reason)
{
  if (reason == APP_SHUTDOWN)
      return;

  corelitocl.forEachOpenWindow(corelitocl.unloadFromWindow);
  Services.wm.removeListener(WindowListener);

  // HACK WARNING: The Addon Manager does not properly clear all addon related caches on update;
  //               in order to fully update images and locales, their caches need clearing here
  Services.obs.notifyObservers(null, "chrome-flush-caches", null);
}

function install(data,reason) { }

function uninstall(data,reason) { }

let corelitocl =
{
  copyReminders: function (aWindow)
  {
    let reminderList = aWindow.document.getElementById("alarm-richlist");
    //reminderList.getItemAtIndex(0).item.title
    let copyString = "";
    for (let aReminderNr = 0; aReminderNr < reminderList.itemCount; aReminderNr++)
    {
      let reminder = reminderList.getItemAtIndex(aReminderNr);
      // compatibility: Remove value code after minVersion >= 45 (change by bug 412202)
      let aTitleNode = aWindow.document.getAnonymousElementByAttribute(reminder, "anonid", "alarm-title-label");
      let aTitle = aTitleNode.value ? aTitleNode.value : aTitleNode.textContent;
      let aDatetime = aWindow.document.getAnonymousElementByAttribute(reminder, "anonid", "alarm-date-label").textContent;
      // compatibility: Remove value code after minVersion >= 45 (change by bug 412202)
      let aLocationNode = aWindow.document.getAnonymousElementByAttribute(reminder, "anonid", "alarm-location-description");
      let aLocationVisible = !aLocationNode.hidden;
      let aLocation = aLocationNode.value ? aLocationNode.value : aLocationNode.textContent;
      copyString += `${aTitle} (${aDatetime}${aLocationVisible ? ` - ${aLocation}` : ""})\n`;
    }
    let gClipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"]
                                     .getService(Components.interfaces.nsIClipboardHelper);
    gClipboardHelper.copyString(copyString);
  },

  forEachOpenWindow: function (aFunctionToExecute)
  {
    let windows = Services.wm.getEnumerator("Calendar:AlarmWindow");
    while (windows.hasMoreElements())
    {
      aFunctionToExecute(windows.getNext().QueryInterface(Components.interfaces.nsIDOMWindow));
    }
  },

  loadIntoWindow: function (aWindow)
  {
    let toolbar = aWindow.document.getElementById("alarm-actionbar");
    let button = aWindow.document.createElement("button");
    button.setAttribute("id", "corelitocl-button");
    button.setAttribute("label", "Copy Reminders");
    button.setAttribute("tooltiptext", "Copy reminder list to clipboard");
    let snoozeAllButton = aWindow.document.getElementById("alarm-snooze-all-button");
    toolbar.insertBefore(button, snoozeAllButton);
    button.addEventListener("command", function () { corelitocl.copyReminders(aWindow); });
  },
  
  unloadFromWindow: function (aWindow)
  {
    let button = aWindow.document.getElementById("corelitocl-button");
    if (button)
    {
      button.removeEventListener("command", function () { corelitocl.copyReminders(aWindow); });
      button.remove();
    }
  },
}

let WindowListener =
{
  onOpenWindow: function(xulWindow)
  {
    function onWindowLoad()
    {
      window.removeEventListener("load",onWindowLoad);
      if (window.document.documentElement.getAttribute("windowtype") == "Calendar:AlarmWindow")
      {
        corelitocl.loadIntoWindow(window);
      }
    }
    let window = xulWindow.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                          .getInterface(Components.interfaces.nsIDOMWindow);
    window.addEventListener("load", onWindowLoad);
  },

  onCloseWindow: function(xulWindow) { },

  onWindowTitleChange: function(xulWindow, newTitle) { },
};
