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

import {CommonUtils as Utils} from '@natlibfi/melinda-record-import-commons';
const {readEnvironmentVariable} = Utils;

// Default is 30 minutes
export const RECORDS_FETCH_LIMIT = 1000;
export const POLL_INTERVAL = readEnvironmentVariable('POLL_INTERVAL', 1800000);
export const EARLIEST_CATALOG_TIME = readEnvironmentVariable('EARLIEST_CATALOG_TIME', '2018-09-01');
export const POLL_CHANGE_TIMESTAMP = readEnvironmentVariable('POLL_CHANGE_TIMESTAMP', undefined);
export const CHANGE_TIMESTAMP_FILE = readEnvironmentVariable('CHANGE_TIMESTAMP_FILE', '.poll-change-timestamp.json');

export const HELMET_API_URL = readEnvironmentVariable('HELMET_API_URL');
export const HELMET_API_KEY = readEnvironmentVariable('HELMET_API_KEY');
export const HELMET_API_SECRET = readEnvironmentVariable('HELMET_API_SECRET');

export const RECORD_IMPORT_API_URL = readEnvironmentVariable('RECORD_IMPORT_API_URL');
export const RECORD_IMPORT_API_PROFILE = readEnvironmentVariable('RECORD_IMPORT_API_PROFILE');
export const RECORD_IMPORT_API_USERNAME = readEnvironmentVariable('RECORD_IMPORT_API_USERNAME');
export const RECORD_IMPORT_API_PASSWORD = readEnvironmentVariable('RECORD_IMPORT_API_PASSWORD');
