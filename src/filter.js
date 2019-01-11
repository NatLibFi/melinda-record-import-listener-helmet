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

import moment from 'moment';

const EXCLUDED_MATERIAL_TYPES = [
	'd',
	'e',
	'q',
	'4',
	'6',
	'j',
	'7',
	'n',
	'f'
];

export default function (record, earliestCatalogTime) {
	const leader = record.varFields.find(f => f.fieldTag === '_');
	const materialType = record.materialType.code.trim();

	checkLeader();

	if (EXCLUDED_MATERIAL_TYPES.includes(materialType)) {
		return false;
	}

	if (isFromOverDrive()) {
		return false;
	}

	if (!record.catalogDate || !moment(record.catalogDate).isValid()) {
		return false;
	}

	if (earliestCatalogTime && moment(record.catalogDate).isBefore(earliestCatalogTime)) {
		return false;
	}

	return true;

	function checkLeader() {
		if (!leader) {
			return false;
		}

		if (leader.content[17] !== '4') {
			return false;
		}

		if (['c', 'd', 'j'].includes(leader.content[6])) {
			return false;
		}

		if (leader.content[7] === 'm') {
			const f655 = record.varFields.find(f => f.marcTag === '655');

			if (f655) {
				const a = f655.subfields.find(sf => sf.tag === 'a');

				if (a && a.content === 'kartastot') {
					return false;
				}
			}
		}
	}

	function isFromOverDrive() {
		const f037 = record.varFields.filter(f => f.marcTag === '037');
		const f710 = record.varFields.filter(f => f.marcTag === '710');

		return f037.some(match037) || f710.some(match710);

		function match037(f) {
			const b = f.subfields.find(sf => sf.code === 'b' && /^OverDrive/.test(sf.value));
			const n = f.subfields.find(sf => sf.code === 'n' && sf.value === 'http://www.overdrive.com');
			return b && n;
		}

		function match710(f) {
			return f.subfields.find(sf => sf.code === 'a' && /^OverDrive/.test(sf.value));
		}
	}
}
