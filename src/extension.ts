// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "safe-dep" is now active!');
  searchForPackageJsonFiles(vscode.workspace.rootPath!);

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "safe-dep.helloWorld",
    () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      vscode.window.showInformationMessage("Hello World from safe dep!");
    }
  );

  //trigger as soon as a project is opened
  vscode.workspace.onDidOpenTextDocument((e) => {
    // vscode.window.showInformationMessage("event triggered: ", e.fileName);
  });

  context.subscriptions.push(disposable);
}

function searchForPackageJsonFiles(folderPath: string) {
  //   vscode.window.showInformationMessage("event triggered: ", folderPath);
  // Use the 'fs' module to search for package.json files recursively
  fs.readdir(folderPath, (err, files) => {
    if (err) {
      return;
    }

    //if the current folder is node_modules, return
    if (folderPath.includes("node_modules")) {
      return;
    }

    files.forEach((file) => {
      const filePath = path.join(folderPath, file);

      fs.stat(filePath, (err, stats) => {
        if (err) {
          return;
        }

        if (stats.isDirectory()) {
          // If it's a directory, search for package.json files recursively
          searchForPackageJsonFiles(filePath);
        } else if (file === "package.json") {
          vscode.window.showInformationMessage(
            "package json found: ",
            filePath
          );
          // If it's a package.json file, read and parse its contents
          // count++;
          // vscode.window.showInformationMessage("count: " + count);
          fs.readFile(filePath, "utf8", (err: any, data) => {
            if (err) {
              return;
            }
            vscode.window.showInformationMessage(data, "ok");

            //mark the alternating lines of package.json in green and red
            let lines = data.split("\n");
            let newLines = [];
            for (let i = 0; i < lines.length; i++) {
              if (i % 2 === 0) {
                newLines.push(`<span style="color: green">${lines[i]}</span>`);
              } else {
                newLines.push(`<span style="color: red">${lines[i]}</span>`);
              }
            }
            let html = newLines.join("<br>");
            vscode.window.showInformationMessage(html, "ok");

            try {
              const packageJson = JSON.parse(data);
              // Do something with the package.json data
              console.log("Found package.json:", packageJson.name);
              vscode.window.showInformationMessage(packageJson, "ok");
            } catch (err) {
              console.error("Error parsing package.json:", err);
            }
          });
        }
      });
    });
  });
}

// This method is called when your extension is deactivated
export function deactivate() {}
