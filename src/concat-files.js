/**
*
* @licstart  The following is the entire license notice for the JavaScript code in this file.
*
* Helmet record harvester for the Melinda record batch import system
*
* Copyright (C) 2018 University Of Helsinki (The National Library Of Finland)
*
* This file is part of melinda-record-import-harvester-helmet
*
* melinda-record-import-harvester-helmet program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Affero General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* melinda-record-import-harvester-helmet is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License
* along with this program.  If not, see <http://www.gnu.org/licenses/>.
*
* @licend  The above is the entire license notice
* for the JavaScript code in this file.
*
*/

import fs from 'fs';
import path from 'path';

if (process.argv.length < 4) {
	console.log('USAGE: <sourceDirectory> <targetFile>');
	process.exit(1);
}

const dir = process.argv[2];
const targetFile = process.argv[3];

const records = fs.readdirSync(dir)
	.sort((a, b) => Number(a) - Number(b))
	.reduce((acc, file) => {
		const records = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
		return acc.concat(records);
	}, []);

fs.writeFileSync(targetFile, JSON.stringify(records, undefined, 2));
