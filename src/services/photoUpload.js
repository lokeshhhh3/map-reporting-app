// ---------------------------------------------------------------------------
// photoUpload.js  --  turns a chosen file into a picture the app can show.
//
// STEP 7 OF THE PLAN: "Add Photos".
// TODAY: this file works on its own (it shrinks the photo in the browser and
//        returns a data URL), so your demo works without any backend.
// LATER: the Backend Team will give you a function that uploads to
//        Firebase Storage and returns a download URL. When that happens you
//        only replace the body of uploadPhoto() - the form does not change.
// ---------------------------------------------------------------------------

import { MAX_PHOTO_MB } from '../utils/constants.js'

/** Read a File object as a text data URL. */
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read that photo.'))
    reader.readAsDataURL(file)
  })
}

/** Shrink big camera photos so the page (and the database) stays small. */
function shrinkImage(dataUrl, maxWidth = 900, quality = 0.7) {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => {
      try {
        const scale = Math.min(1, maxWidth / image.width)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(image.width * scale)
        canvas.height = Math.round(image.height * scale)

        const context = canvas.getContext('2d')
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      } catch {
        resolve(dataUrl) // if anything fails, just use the original
      }
    }
    image.onerror = () => resolve(dataUrl)
    image.src = dataUrl
  })
}

/**
 * uploadPhoto(file) -> Promise<string>   (the photo's URL)
 * This is the ONLY function the form needs. Swap its insides later.
 */
export async function uploadPhoto(file) {
  if (!file) return ''

  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file (jpg or png).')
  }
  if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
    throw new Error(`Photo must be smaller than ${MAX_PHOTO_MB} MB.`)
  }

  // ---- REPLACE THIS BLOCK LATER WITH THE BACKEND TEAM'S CODE -------------
  // import { uploadReportPhoto } from './firebaseStorage.js'   <-- their file
  // const url = await uploadReportPhoto(file)                  <-- their call
  // return url
  // -----------------------------------------------------------------------
  const dataUrl = await fileToDataUrl(file)
  return shrinkImage(dataUrl)
}
