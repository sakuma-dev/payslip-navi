package expo.modules.payslipocr

import android.content.pm.ApplicationInfo
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.japanese.JapaneseTextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class PayslipOcrModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PayslipOcr")

    AsyncFunction("prepareStorage") { promise: Promise ->
      try {
        val context = appContext.reactContext ?: throw IllegalStateException()
        // Refuse to persist if the app's privacy plugin was not applied.
        if ((context.applicationInfo.flags and ApplicationInfo.FLAG_ALLOW_BACKUP) != 0) {
          throw IllegalStateException()
        }
        val directory = File(context.noBackupFilesDir, "payslip-database")
        if (!directory.exists() && !directory.mkdirs()) throw IllegalStateException()
        if (!directory.isDirectory || !directory.canWrite()) throw IllegalStateException()
        promise.resolve(Uri.fromFile(directory).toString())
      } catch (_: Exception) {
        promise.reject("STORAGE_UNAVAILABLE", "端末保存の保護設定を準備できません。", null)
      }
    }

    AsyncFunction("recognize") { uri: String, promise: Promise ->
      try {
        val context = appContext.reactContext ?: throw IllegalStateException()
        val imageUri = Uri.parse(uri)
        if (imageUri.scheme != "file") throw IllegalArgumentException()
        val path = File(imageUri.path ?: throw IllegalArgumentException()).canonicalFile
        val cache = context.cacheDir.canonicalPath + File.separator
        if (!path.path.startsWith(cache)) throw IllegalArgumentException()
        // fromFilePath applies the image's EXIF rotation when decoding.
        val image = InputImage.fromFilePath(context, imageUri)
        val rotated = image.rotationDegrees == 90 || image.rotationDegrees == 270
        val width = if (rotated) image.height else image.width
        val height = if (rotated) image.width else image.height
        if (width <= 0 || height <= 0) throw IllegalArgumentException()
        val recognizer = TextRecognition.getClient(JapaneseTextRecognizerOptions.Builder().build())
        recognizer.process(image)
          .addOnSuccessListener { text ->
            val lines = text.textBlocks.flatMap { it.lines }.mapNotNull { line ->
              val rect = line.boundingBox ?: return@mapNotNull null
              val left = (rect.left.toDouble() / width).coerceIn(0.0, 1.0)
              val top = (rect.top.toDouble() / height).coerceIn(0.0, 1.0)
              val right = (rect.right.toDouble() / width).coerceIn(left, 1.0)
              val bottom = (rect.bottom.toDouble() / height).coerceIn(top, 1.0)
              mapOf("text" to line.text, "box" to mapOf("x" to left, "y" to top, "w" to right - left, "h" to bottom - top))
            }
            promise.resolve(mapOf("lines" to lines, "imageSize" to mapOf("width" to width, "height" to height)))
          }
          .addOnFailureListener { promise.reject("OCR_FAILED", "画像を読み取れませんでした。", null) }
          .addOnCompleteListener { recognizer.close() }
      } catch (_: Exception) {
        promise.reject("OCR_FAILED", "画像を読み取れませんでした。", null)
      }
    }
  }
}
