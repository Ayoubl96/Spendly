// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "SpendlyiOS",
    platforms: [
        .iOS(.v16)
    ],
    products: [
        .library(
            name: "SpendlyiOS",
            targets: ["SpendlyiOS"]),
    ],
    dependencies: [
        // Add any external dependencies here if needed
    ],
    targets: [
        .target(
            name: "SpendlyiOS",
            dependencies: [],
            path: "Spendly"
        )
    ]
)