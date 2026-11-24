// Local-only Apple Vision anchors. Raw OCR stays beside the private scans.
// This supplies positions, never transcription truth or student grades.
import Foundation
import Vision
import AppKit

let args = CommandLine.arguments
guard args.count == 3 else { fatalError("usage: swift scan-ocr.swift image.png output.json") }
let url = URL(fileURLWithPath: args[1])
let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.recognitionLanguages = ["ko-KR", "en-US"]
request.usesLanguageCorrection = false
let handler = VNImageRequestHandler(url: url)
try handler.perform([request])
let rows: [[String: Any]] = (request.results ?? []).compactMap { observation in
    guard let candidate = observation.topCandidates(1).first else { return nil }
    let b = observation.boundingBox
    return ["text": candidate.string, "confidence": candidate.confidence,
            "box": [b.minX, 1-b.maxY, b.maxX, 1-b.minY]]
}
try JSONSerialization.data(withJSONObject: rows, options: [.prettyPrinted, .sortedKeys]).write(to: URL(fileURLWithPath: args[2]))
