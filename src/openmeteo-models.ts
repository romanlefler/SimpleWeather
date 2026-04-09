/*
    Copyright 2026 Roman Lefler

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

export enum OmModel {
    AUTO = "best_match",
    DWD_GERMANY = "icon_seamless",
    NOAA_US = "gfs_seamless",
    METEO_FRANCE = "meteofrance_seamless",
    ECMWF = "ecmwf_ifs",
    UK_MET_OFFICE = "ukmo_seamless",
    KMA_KOREA = "kma_seamless",
    JMA_JAPAN = "jma_seamless",
    METEO_SWISS = "meteoswiss_icon_seamless",
    MET_NORWAY = "metno_seamless",
    GEM_CANADA = "gem_seamless",
    BOM_AUSTRALIA = "bom_access_global",
    CMA_CHINA = "cma_grapes_global",
    KNMI_NETHERLANDS = "knmi_seamless",
    DMI_DENMARK = "dmi_seamless",
    ITALIA_METEO = "italia_meteo_arpae_icon_2i"
}

export const OmName : Record<OmModel, string> = {
    "best_match": "Auto",
    "icon_seamless": "DWD Germany",
    "gfs_seamless": "NOAA US",
    "meteofrance_seamless": "M\u00E9t\u00E9o France",
    "ecmwf_ifs": "ECMWF",
    "ukmo_seamless": "UK Met Office",
    "kma_seamless": "KMA Korea",
    "jma_seamless": "JMA Japan",
    "meteoswiss_icon_seamless": "Meteo Swiss",
    "metno_seamless": "Met Norway",
    "gem_seamless": "GEM Canada",
    "bom_access_global": "BOM Australia",
    "cma_grapes_global": "CMA China",
    "knmi_seamless": "KNMI Netherlands",
    "dmi_seamless": "DMI Denmark",
    "italia_meteo_arpae_icon_2i": "Italia Meteo"
};

