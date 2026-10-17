/**
 * ========================================================
 * 📸 DIGITAL PHOTO BOOTH - GOOGLE APPS SCRIPT BACKEND
 * ========================================================
 * 
 * Instructions:
 * 1. Open Google Apps Script: https://script.google.com/
 * 2. Paste this entire file into your Apps Script project (Code.gs).
 * 3. Replace DEFAULT_FOLDER_ID with your Google Drive Folder ID (if not passed from frontend).
 * 4. Click 'Deploy' > 'New deployment'
 *    - Type: Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the generated Web App URL and set it as VITE_GOOGLE_SCRIPT_URL in your .env file.
 */

// Fallback folder ID if not passed from frontend env
var DEFAULT_FOLDER_ID = "YOUR_FALLBACK_FOLDER_ID_HERE";

/**
 * GET Handler: Fetches all images from the Google Drive Folder for Live Wall & Gallery
 */
function doGet(e) {
  try {
    // 1. Get folder ID from query param (sent via frontend .env) or fallback
    var targetFolderId = (e && e.parameter && e.parameter.folderId) ? e.parameter.folderId : DEFAULT_FOLDER_ID;
    
    var folder = DriveApp.getFolderById(targetFolderId);
    var files = folder.getFiles();
    var photos = [];

    while (files.hasNext()) {
      var file = files.next();
      var mime = file.getMimeType();
      
      // Filter only image files
      if (mime.indexOf("image/") !== -1) {
        var fileId = file.getId();
        photos.push({
          id: fileId,
          name: file.getName(),
          // Direct web streamable image URLs (Works universally on websites)
          url: "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w1920",
          thumbnailUrl: "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w600",
          viewLink: file.getUrl(),
          timestamp: file.getDateCreated().getTime()
        });
      }
    }

    // Sort newest photos first
    photos.sort(function(a, b) {
      return b.timestamp - a.timestamp;
    });

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      photos: photos
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * POST Handler: Saves newly captured photo from Booth into Google Drive
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var base64Data = data.image;
    
    // Get folder ID from payload or fallback
    var targetFolderId = data.folderId ? data.folderId : DEFAULT_FOLDER_ID;
    var folder = DriveApp.getFolderById(targetFolderId);

    // Decode base64 image
    var decoded = Utilities.base64Decode(base64Data);
    var fileName = "booth_" + Utilities.formatDate(new Date(), "GMT+5:30", "yyyyMMdd_HHmmss") + ".png";
    var blob = Utilities.newBlob(decoded, "image/png", fileName);

    // Create file in folder
    var file = folder.createFile(blob);
    // Allow public viewing so Live Wall and users can load it instantly
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      fileId: file.getId(),
      viewLink: file.getUrl(),
      directUrl: "https://lh3.googleusercontent.com/d/" + file.getId()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
