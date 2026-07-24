// 画作取色：从 assets/*.jpg 提取代表色（暗部/中间调/亮部平均色 + 饱和主色 Top3）
// 运行：xcrun swift tools/extract-colors.swift
import AppKit
import Foundation

func hex(_ r: Int, _ g: Int, _ b: Int) -> String {
    String(format: "#%02x%02x%02x", r, g, b)
}

struct Acc { var r = 0, g = 0, b = 0, n = 0 }

func avgHex(_ a: Acc, fallback: String) -> String {
    a.n == 0 ? fallback : hex(a.r / a.n, a.g / a.n, a.b / a.n)
}

func analyze(_ path: String) -> [String: Any] {
    guard let img = NSImage(contentsOfFile: path) else {
        return ["error": "cannot load \(path)"]
    }
    let W = 64, H = 64
    guard let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil, pixelsWide: W, pixelsHigh: H,
        bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
        colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0
    ) else { return ["error": "bitmap"] }

    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    img.draw(in: NSRect(x: 0, y: 0, width: W, height: H))
    NSGraphicsContext.restoreGraphicsState()

    var dark = Acc(), mid = Acc(), light = Acc()
    var hueBins: [Int: Acc] = [:]

    for y in 0..<H {
        for x in 0..<W {
            guard let c = rep.colorAt(x: x, y: y) else { continue }
            let r = Int(c.redComponent * 255), g = Int(c.greenComponent * 255), b = Int(c.blueComponent * 255)
            let mx = max(r, g, b), mn = min(r, g, b)
            let lum = 0.299 * Double(r) + 0.587 * Double(g) + 0.114 * Double(b)
            let sat = mx == 0 ? 0.0 : Double(mx - mn) / Double(mx)

            if lum < 70 { dark.r += r; dark.g += g; dark.b += b; dark.n += 1 }
            else if lum < 160 { mid.r += r; mid.g += g; mid.b += b; mid.n += 1 }
            else { light.r += r; light.g += g; light.b += b; light.n += 1 }

            if sat > 0.35 {
                var h = 0.0
                let d = Double(mx - mn)
                if d > 0 {
                    if mx == r { h = (Double(g - b) / d).truncatingRemainder(dividingBy: 6) }
                    else if mx == g { h = Double(b - r) / d + 2 }
                    else { h = Double(r - g) / d + 4 }
                    h *= 60
                    if h < 0 { h += 360 }
                }
                let bin = Int(h / 30)
                var e = hueBins[bin] ?? Acc()
                e.r += r; e.g += g; e.b += b; e.n += 1
                hueBins[bin] = e
            }
        }
    }

    let top = hueBins
        .sorted { $0.value.n > $1.value.n }
        .prefix(3)
        .map { avgHex($0.value, fallback: "#000000") }

    return [
        "dark": avgHex(dark, fallback: "#000000"),
        "mid": avgHex(mid, fallback: "#808080"),
        "light": avgHex(light, fallback: "#ffffff"),
        "saturatedTop": top,
    ]
}

let files = ["assets/wave.jpg", "assets/starry.jpg", "assets/wheat.jpg", "assets/parasol.jpg"]
var result: [String: Any] = [:]
for f in files { result[f] = analyze(f) }

let data = try! JSONSerialization.data(withJSONObject: result, options: [.prettyPrinted, .sortedKeys])
print(String(data: data, encoding: .utf8)!)
