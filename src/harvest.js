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
import {URL} from 'url';
import moment from 'moment';
import fetch from 'node-fetch';
import HttpStatusCodes from 'http-status-codes';
import nodeUtils from 'util';
import {createLogger} from '@natlibfi/melinda-record-import-commons';
import filterRecord from './filter';

export default async function ({recordsCallback, apiURL, apiKey, apiSecret, recordsFetchLimit, pollInterval, pollChangeTimestamp, changeTimestampFile, earliestCatalogTime = moment(), onlyOnce = false}) {
	const Logger = createLogger();

	return process();

	async function process({authorizationToken, pollChangeTime} = {}) {
		const setTimeoutPromise = nodeUtils.promisify(setTimeout);

		pollChangeTime = pollChangeTime || getPollChangeTime();
		authorizationToken = await validateAuthorizationToken(authorizationToken); // eslint-disable-line require-atomic-updates

		const timeBeforeFetching = moment();

		Logger.log('debug', `Fetching records updated between ${pollChangeTime.format()} - ${timeBeforeFetching.format()}`);
		await harvest({endTime: timeBeforeFetching});

		if (!onlyOnce) {
			Logger.log('debug', `Waiting ${pollInterval / 1000} seconds before polling again`);
			await setTimeoutPromise(pollInterval);
			writePollChangeTimestamp(timeBeforeFetching);
			return process({authorizationToken, pollChangeTime: timeBeforeFetching.add(1, 'seconds')});
		}

		function getPollChangeTime() {
			if (fs.existsSync(changeTimestampFile)) {
				const data = JSON.parse(fs.readFileSync(changeTimestampFile, 'utf8'));
				return moment(data.timestamp);
			}

			if (pollChangeTimestamp) {
				return moment(pollChangeTimestamp);
			}

			return moment();
		}

		function writePollChangeTimestamp(time) {
			fs.writeFileSync(changeTimestampFile, JSON.stringify({
				timestamp: time.format()
			}));
		}

		async function validateAuthorizationToken(token) {
			if (token) {
				const response = await fetch(`${apiURL}/info/token`);
				if (response.status === HttpStatusCodes.OK) {
					return token;
				}
			}

			return authenticate();

			async function authenticate() {
				const credentials = `${apiKey}:${apiSecret}`;
				const response = await fetch(`${apiURL}/token`, {
					method: 'POST', headers: {
						Authorization: `Basic ${Buffer.from(credentials).toString('base64')}`
					}
				});

				const body = await response.json();
				return body.access_token;
			}
		}

		async function harvest({offset = 0, endTime} = {}) {
			const url = new URL(`${apiURL}/bibs`);

			url.searchParams.set('offset', offset);
			url.searchParams.set('limit', recordsFetchLimit);
			url.searchParams.set('deleted', false);
			url.searchParams.set('fields', 'id,materialType,varFields,catalogDate');
			url.searchParams.set('updatedDate', generateTimespan(endTime));

			const response = await fetch(url.toString(), {
				headers: {
					Authorization: `Bearer ${authorizationToken}`,
					Accept: 'application/json'
				}
			});

			if (response.status === HttpStatusCodes.OK) {
				const result = await response.json();
				Logger.log('debug', `Retrieved ${result.entries.length} records`);

				const filtered = result.entries.filter(r => filterRecord(r, earliestCatalogTime));
				Logger.log('debug', `${filtered.length}/${result.entries.length} records passed the filter`);

				if (filtered.length > 0) {
					await recordsCallback(filtered);
				}

				if (result.entries.length === recordsFetchLimit) {
					return harvest({
						offset: offset + recordsFetchLimit,
						endTime
					});
				}
			} else if (response.status === HttpStatusCodes.NOT_FOUND) {
				Logger.log('debug', 'No records found');
			} else {
				throw new Error(`Received HTTP ${response.status} ${response.statusText}`);
			}

			function generateTimespan(endTime) {
				return `[${pollChangeTime.format()},${endTime.format()}]`;
			}
		}
	}
}
