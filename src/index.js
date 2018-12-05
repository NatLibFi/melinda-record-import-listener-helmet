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

/* eslint-disable no-unused-vars, require-await */

'use strict';

import fs from 'fs';
import path from 'path';
import {URL, URLSearchParams} from 'url';
import moment from 'moment';
import fetch from 'node-fetch';
import HttpStatusCodes from 'http-status-codes';
import nodeUtils from 'util';
import {CommonUtils as Utils} from '@natlibfi/melinda-record-import-commons';

import {
	RECORDS_FETCH_LIMIT, POLL_INTERVAL, EARLIEST_CATALOG_TIME,
	POLL_CHANGE_TIMESTAMP, CHANGE_TIMESTAMP_FILE,
	RECORD_IMPORT_API_URL, RECORD_IMPORT_API_PROFILE,
	RECORD_IMPORT_API_USERNAME, RECORD_IMPORT_API_PASSWORD,
	HELMET_API_URL, HELMET_API_KEY, HELMET_API_SECRET
} from './config';

const {registerSignalHandlers, createLogger} = Utils;
run();

async function run() {
	registerSignalHandlers();

	const earliestCatalogTime = EARLIEST_CATALOG_TIME ? moment(EARLIEST_CATALOG_TIME) : undefined;
	const setTimeoutPromise = nodeUtils.promisify(setTimeout);

	const logger = createLogger();

	try {
		logger.log('info', 'Starting melinda-record-import-harvester-helmet');
		await processRecords();
		process.exit();
	} catch (err) {
		logger.error(err.stack);
		process.exit(-1);
	}

	async function processRecords(authorizationToken, pollChangeTime) {
		pollChangeTime = pollChangeTime || getPollChangeTime();
		authorizationToken = await validateAuthorizationToken(authorizationToken); // eslint-disable-line require-atomic-updates

		logger.log('debug', `Fetching records updated after ${pollChangeTime.format()}`);

		const {timeBeforeFetching, numberOfRecordsFound, records} = await fetchRecords();

		logger.log('info', `${records.length}/${numberOfRecordsFound} records passed the filter`);

		if (records.length > 0) {
			await sendRecords(records);
		}

		logger.log('debug', `Waiting ${POLL_INTERVAL / 1000} seconds before polling again`);
		await setTimeoutPromise(POLL_INTERVAL);

		writePollChangeTimestamp(timeBeforeFetching);

		return processRecords(authorizationToken, timeBeforeFetching.add(1, 'seconds'));

		function getPollChangeTime() {
			if (fs.existsSync(CHANGE_TIMESTAMP_FILE)) {
				const data = JSON.parse(fs.readFileSync(CHANGE_TIMESTAMP_FILE, 'utf8'));
				return moment(data.timestamp);
			}

			if (POLL_CHANGE_TIMESTAMP) {
				return moment(POLL_CHANGE_TIMESTAMP);
			}

			return moment();
		}

		function writePollChangeTimestamp(time) {
			fs.writeFileSync(CHANGE_TIMESTAMP_FILE, JSON.stringify({
				timestamp: time.format()
			}));
		}

		async function validateAuthorizationToken(token) {
			if (token) {
				const response = await fetch(`${HELMET_API_URL}/info/token`);
				if (response.status === HttpStatusCodes.OK) {
					return token;
				}
			}

			return authenticate();

			async function authenticate() {
				const credentials = `${HELMET_API_KEY}:${HELMET_API_SECRET}`;
				const response = await fetch(`${HELMET_API_URL}/token`, {method: 'POST', headers: {
					Authorization: `Basic ${Buffer.from(credentials).toString('base64')}`
				}});

				const body = await response.json();
				return body.access_token;
			}
		}

		async function fetchRecords({offset = 0, records = [], numberOfRecordsFound = 0, timeBeforeFetching} = {}) {
			timeBeforeFetching = records.length > 0 ? timeBeforeFetching : moment();

			const url = new URL(`${HELMET_API_URL}/bibs`);
			const parameters = new URLSearchParams({
				offset,
				limit: RECORDS_FETCH_LIMIT,
				deleted: false,
				fields: 'id,materialType,varFields,catalogDate',
				updatedDate: generateTimespan(timeBeforeFetching)
			});

			url.search = parameters;

			const response = await fetch(url.toString(), {headers: {
				Authorization: `Bearer ${authorizationToken}`,
				Accept: 'application/json'
			}});

			if (response.status === HttpStatusCodes.OK) {
				const result = await response.json();
				const originalLength = result.entries.length;

				numberOfRecordsFound += originalLength;

				result.entries = result.entries.filter(filterRecords);

				logger.log('debug', `Retrieved ${result.entries.length} records`);

				if (originalLength === RECORDS_FETCH_LIMIT) {
					return fetchRecords({
						offset: offset + RECORDS_FETCH_LIMIT,
						records: records.concat(result.entries),
						numberOfRecordsFound, timeBeforeFetching
					});
				}

				return {records: records.concat(result.entries), timeBeforeFetching, numberOfRecordsFound};
			}

			if (response.status === HttpStatusCodes.NOT_FOUND) {
				logger.log('debug', 'No records found');
				return {records, timeBeforeFetching, numberOfRecordsFound};
			}

			throw new Error(`Received HTTP ${response.status} ${response.statusText}`);

			function generateTimespan(endTime) {
				return `[${pollChangeTime.format()},${endTime.format()}]`;
			}
		}

		function filterRecords(record) {
			const leader = record.varFields.find(f => f.fieldTag === '_');
			const materialType = record.materialType.code.trim();

			if (!record.catalogDate || !moment(record.catalogDate).isValid()) {
				return false;
			}

			if (earliestCatalogTime && moment(record.catalogDate).isBefore(earliestCatalogTime)) {
				return false;
			}

			if (!leader) {
				return false;
			}

			/*if (record.varFields.some(f => f.fieldTag === '007')) {
				return false;
			}*/

			if (isFromOverDrive()) {
				return false;
			}

			if (leader.content[7] === 'm') {
				const f655 = record.varFields.find(f => f.fieldTag === '655');

				if (f655) {
					const a = f655.subfields.find(sf => sf.tag === 'a');

					if (a && a.content === 'kartastot') {
						return false;
					}
				}
			}

			if (leader.content[17] !== '4') {
				return false;
			}

			if (['q', '7'].includes(materialType)) {
				return false;
			}

			if (['c', 'd', 'j'].includes(leader.content[6])) {
				return false;
			}

			return true;

			function isFromOverDrive() {
				const f037 = record.varFields.filter(f => f.fieldTag === '037');
				const f710 = record.varFields.filter(f => f.fieldTag === '710');

				return f037.some(match037) || f710.some(match710);

				function match037(f) {
					const b = f.subfields.find(sf => sf.code === 'b' && sf.value === 'OverDrive, Inc.');
					const n = f.subfields.find(sf => sf.code === 'n' && sf.value === 'http://www.overdrive.com');
					return b && n;
				}

				function match710(f) {
					return f.subfields.find(sf => sf.code === 'a' && /^OverDrive/.test(sf.value));
				}
			}
		}

		async function sendRecords(records) { // eslint-disable-line require-await
			fs.writeFileSync('fetched.json', JSON.stringify(records, undefined, 2));
			// Use Record import API to create Blobs
			logger.log('info', `Created new blob x containing ${records.length} records`);
		}
	}
}
