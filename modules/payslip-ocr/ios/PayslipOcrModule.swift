import ExpoModulesCore
import Foundation
import ImageIO
import Vision

public final class PayslipOcrModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PayslipOcr")

    AsyncFunction("prepareStorage") { () throws -> String in
      do {
        let manager = FileManager.default
        let root = try manager.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
        var directory = root.appendingPathComponent("PayslipDatabase", isDirectory: true)
        try manager.createDirectory(at: directory, withIntermediateDirectories: true)
        var attributes = URLResourceValues()
        attributes.isExcludedFromBackup = true
        try directory.setResourceValues(attributes)
        let verified = try directory.resourceValues(forKeys: [.isExcludedFromBackupKey, .isDirectoryKey])
        guard verified.isExcludedFromBackup == true, verified.isDirectory == true else { throw StorageUnavailable() }
        // Database, WAL and SHM all live underneath this excluded directory.
        return directory.absoluteString
      } catch {
        throw StorageUnavailable()
      }
    }

    AsyncFunction("recognize") { (uri: String) throws -> [String: Any] in
      do {
        guard let url = URL(string: uri), url.isFileURL else { throw RecognitionFailed() }
        let cache = try FileManager.default.url(for: .cachesDirectory, in: .userDomainMask, appropriateFor: nil, create: false)
        guard url.resolvingSymlinksInPath().path.hasPrefix(cache.resolvingSymlinksInPath().path + "/") else { throw RecognitionFailed() }
        guard let source = CGImageSourceCreateWithURL(url as CFURL, nil) else { throw RecognitionFailed() }
        // ImageIO physically applies all EXIF orientations, including mirrored images.
        let options: [CFString: Any] = [
          kCGImageSourceCreateThumbnailFromImageAlways: true,
          kCGImageSourceCreateThumbnailWithTransform: true,
          kCGImageSourceThumbnailMaxPixelSize: 2400
        ]
        guard let image = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else { throw RecognitionFailed() }
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.recognitionLanguages = ["ja-JP"]
        request.usesLanguageCorrection = false
        guard try request.supportedRecognitionLanguages().contains("ja-JP") else { throw RecognitionFailed() }
        try VNImageRequestHandler(cgImage: image, orientation: .up, options: [:]).perform([request])
        let lines: [[String: Any]] = (request.results ?? []).compactMap { observation in
          guard let candidate = observation.topCandidates(1).first else { return nil }
          let rect = observation.boundingBox
          return [
            "text": candidate.string,
            // Vision's origin is bottom-left; public coordinates are top-left.
            "box": ["x": rect.minX, "y": 1 - rect.maxY, "w": rect.width, "h": rect.height],
            "confidence": candidate.confidence
          ]
        }
        return ["lines": lines, "imageSize": ["width": image.width, "height": image.height]]
      } catch {
        throw RecognitionFailed()
      }
    }
  }
}

private final class StorageUnavailable: Exception {
  override var reason: String { "端末保存の保護設定を準備できません。" }
}
private final class RecognitionFailed: Exception {
  override var reason: String { "画像を読み取れませんでした。" }
}
