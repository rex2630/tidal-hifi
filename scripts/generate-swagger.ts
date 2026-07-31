import fs from "node:fs";
import swaggerjsdoc from "swagger-jsdoc";

const packagejson = JSON.parse(fs.readFileSync("package.json", "utf8"));

const specs = swaggerjsdoc({
  definition: {
    openapi: "3.1.0",
    info: {
      title: "TIDAL Hi-Fi API",
      version: packagejson.version,
      description: "",
      license: {
        name: packagejson.license,
        url: "https://github.com/Mastermindzh/tidal-hifi/blob/master/LICENSE",
      },
      contact: {
        name: "Rick <mastermindzh> van Lieshout",
        url: "https://www.rickvanlieshout.com",
      },
    },
    externalDocs: {
      description: "swagger.json",
      url: "swagger.json",
    },
  },
  apis: ["**/*.ts"],
});

const outputPath = "src/features/api/swagger.json";
const contents = JSON.stringify(specs, null, 2);

const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : null;
if (existing === contents) {
  console.log("swagger.json unchanged, skipping write");
} else {
  fs.writeFileSync(outputPath, contents, "utf8");
  console.log("Written swagger.json");
}
