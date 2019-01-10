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

/* eslint-disable import/default */

import {registerSignalHandlers, createLogger, createApiClient} from '@natlibfi/melinda-record-import-commons';
import startHarvesting from './harvest';

import {
	RECORDS_FETCH_LIMIT, POLL_INTERVAL, EARLIEST_CATALOG_TIME,
	POLL_CHANGE_TIMESTAMP, CHANGE_TIMESTAMP_FILE,
	RECORD_IMPORT_URL, RECORD_IMPORT_PROFILE,
	RECORD_IMPORT_USERNAME, RECORD_IMPORT_PASSWORD,
	HELMET_API_URL, HELMET_API_KEY, HELMET_API_SECRET
} from './config';

run();

async function run() {
	const Logger = createLogger();
	const client = createApiClient({url: RECORD_IMPORT_URL, username: RECORD_IMPORT_USERNAME, password: RECORD_IMPORT_PASSWORD});

	registerSignalHandlers();

	try {
		Logger.log('info', 'Starting melinda-record-import-harvester-helmet');

		await startHarvesting({
			recordsCallback: createBlob,
			apiURL: HELMET_API_URL,
			apiKey: HELMET_API_KEY,
			apiSecret: HELMET_API_SECRET,
			pollChangeTimestamp: POLL_CHANGE_TIMESTAMP,
			pollInterval: POLL_INTERVAL,
			changeTimestampFile: CHANGE_TIMESTAMP_FILE,
			recordsFetchLimit: RECORDS_FETCH_LIMIT,
			earliestCatalogTime: EARLIEST_CATALOG_TIME
		});

		process.exit();
	} catch (err) {
		Logger.log('error', err.stack);
		process.exit(-1);
	}

	async function createBlob(records) {
		const id = await client.create({
			blob: JSON.stringify(records),
			type: 'application/json',
			profile: RECORD_IMPORT_PROFILE
		});

		Logger.info(`Created new blob ${id}`);
	}
}
