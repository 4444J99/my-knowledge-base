#!/usr/bin/env node
/**
 * JXA Script to Export Apple Notes (Robust UTF-8 Version)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, unlinkSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

async function exportNotes(folderName = '') {
    const outputPath = join(tmpdir(), `notes-data-${Date.now()}.json`);
    const scriptPath = join(tmpdir(), `notes-export-${Date.now()}.js`);
    
    const jxaCode = `
      var Notes = Application("com.apple.Notes");
      var notesList = [];
      
      try {
        var allNotes = Notes.notes();
        var count = allNotes.length;
        
        for (var i = 0; i < count; i++) {
          try {
            var n = allNotes[i];
            notesList.push({
              id: n.id(),
              name: n.name(),
              body: n.body(),
              creationDate: n.creationDate().toISOString(),
              modificationDate: n.modificationDate().toISOString(),
              folder: "Ingested"
            });
          } catch(e) {}
        }
        
        var str = JSON.stringify(notesList);
        // Use Cocoa for robust UTF-8 writing
        var nsStr = $.NSString.stringWithString(str);
        nsStr.writeToFileAtomicallyEncodingError("${outputPath}", true, $.NSUTF8StringEncoding, null);
        "SUCCESS";
      } catch(e) {
        "ERROR: " + e.toString();
      }
    `;

    try {
      writeFileSync(scriptPath, jxaCode);
      const { stdout } = await execAsync(`osascript -l JavaScript "${scriptPath}"`, {
          timeout: 300000
      });

      if (stdout.trim().includes("SUCCESS")) {
          if (existsSync(outputPath)) {
              const data = readFileSync(outputPath, 'utf-8');
              try { unlinkSync(outputPath); } catch(e) {}
              return data;
          }
      }
      return '[]';
    } catch (error) {
      return '[]';
    } finally {
      try { unlinkSync(scriptPath); } catch(e) {}
    }
}

const folder = process.argv[2] || '';
exportNotes(folder).then(console.log);
