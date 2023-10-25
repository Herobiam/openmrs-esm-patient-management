import { useMemo } from 'react';
import useSWR from 'swr';
import useSWRImmutable from 'swr/immutable';
import { FetchResponse, openmrsFetch, useConfig } from '@openmrs/esm-framework';
import { Patient, Relationship, PatientIdentifier, Encounter } from './patient-registration.types';

export const uuidIdentifier = '05a29f94-c0ed-11e2-94be-8c13b969e334';
export const uuidTelephoneNumber = '14d4f066-15f5-102d-96e4-000c29c2a5d7';

function dataURItoFile(dataURI: string) {
  const byteString = atob(dataURI.split(',')[1]);
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  // write the bytes of the string to a typed array
  const buffer = new Uint8Array(byteString.length);

  for (let i = 0; i < byteString.length; i++) {
    buffer[i] = byteString.charCodeAt(i);
  }

  const blob = new Blob([buffer], { type: mimeString });
  return new File([blob], 'patient-photo.png');
}

export function savePatient(patient: Patient | null, updatePatientUuid?: string) {
  const abortController = new AbortController();

  return openmrsFetch(`/ws/rest/v1/patient/${updatePatientUuid || ''}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: patient,
    signal: abortController.signal,
  });
}

export function saveEncounter(encounter: Encounter) {
  const abortController = new AbortController();

  return openmrsFetch(`/ws/rest/v1/encounter`, {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: encounter,
    signal: abortController.signal,
  });
}

export function generateIdentifier(source: string) {
  const abortController = new AbortController();

  return openmrsFetch(`/ws/rest/v1/idgen/identifiersource/${source}/identifier`, {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: {},
    signal: abortController.signal,
  });
}

export function deletePersonName(nameUuid: string, personUuid: string) {
  const abortController = new AbortController();

  return openmrsFetch(`/ws/rest/v1/person/${personUuid}/name/${nameUuid}`, {
    method: 'DELETE',
    signal: abortController.signal,
  });
}

export function saveRelationship(relationship: Relationship) {
  const abortController = new AbortController();

  return openmrsFetch('/ws/rest/v1/relationship', {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: relationship,
    signal: abortController.signal,
  });
}

export function updateRelationship(relationshipUuid, relationship: { relationshipType: string }) {
  const abortController = new AbortController();

  return openmrsFetch(`/ws/rest/v1/relationship/${relationshipUuid}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: { relationshipType: relationship.relationshipType },
    signal: abortController.signal,
  });
}

export function deleteRelationship(relationshipUuid) {
  const abortController = new AbortController();

  return openmrsFetch(`/ws/rest/v1/relationship/${relationshipUuid}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'DELETE',
    signal: abortController.signal,
  });
}

export async function savePatientPhoto(
  patientUuid: string,
  content: string,
  url: string,
  date: string,
  conceptUuid: string,
) {
  const abortController = new AbortController();

  const formData = new FormData();
  formData.append('patient', patientUuid);
  formData.append('file', dataURItoFile(content));
  formData.append(
    'json',
    JSON.stringify({
      person: patientUuid,
      concept: conceptUuid,
      groupMembers: [],
      obsDatetime: date,
    }),
  );

  return openmrsFetch(url, {
    method: 'POST',
    signal: abortController.signal,
    body: formData,
  });
}

interface ObsFetchResponse {
  results: Array<PhotoObs>;
}

interface PhotoObs {
  display: string;
  obsDatetime: string;
  uuid: string;
  value: {
    display: string;
    links: {
      rel: string;
      uri: string;
    };
  };
}

interface UsePatientPhotoResult {
  data: { dateTime: string; imageSrc: string } | null;
  isError: Error;
  isLoading: boolean;
}

export function usePatientPhoto(patientUuid: string): UsePatientPhotoResult {
  const {
    concepts: { patientPhotoUuid },
  } = useConfig();
  const url = `/ws/rest/v1/obs?patient=${patientUuid}&concept=${patientPhotoUuid}&v=full`;

  const { data, error, isLoading } = useSWR<{ data: ObsFetchResponse }, Error>(patientUuid ? url : null, openmrsFetch);

  const item = data?.data?.results[0];

  return {
    data: item
      ? {
          dateTime: item?.obsDatetime,
          imageSrc: item?.value?.links?.uri,
        }
      : null,
    isError: error,
    isLoading,
  };
}

export async function fetchPerson(query: string) {
  const BASE_API = '/ws/rest/v1';
  const signal = new AbortController().signal;

  try {
    const personEndpoint = `${BASE_API}/person?q=${query}`;
    const {
      data: { results },
    } = await openmrsFetch(personEndpoint, { signal });

    if (results.length > 0) {
      return { data: { results } };
    }

    const patientEndpoint = `${BASE_API}/patient?q=${query}`;
    return openmrsFetch(patientEndpoint, { signal });
  } catch (error) {
    throw error;
  }
}

export async function addPatientIdentifier(patientUuid: string, patientIdentifier: PatientIdentifier) {
  const abortController = new AbortController();
  return openmrsFetch(`/ws/rest/v1/patient/${patientUuid}/identifier/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: abortController.signal,
    body: patientIdentifier,
  });
}

export async function updatePatientIdentifier(patientUuid: string, identifierUuid: string, identifier: string) {
  const abortController = new AbortController();
  return openmrsFetch(`/ws/rest/v1/patient/${patientUuid}/identifier/${identifierUuid}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: abortController.signal,
    body: { identifier },
  });
}

export async function deletePatientIdentifier(patientUuid: string, patientIdentifierUuid: string) {
  const abortController = new AbortController();
  return openmrsFetch(`/ws/rest/v1/patient/${patientUuid}/identifier/${patientIdentifierUuid}?purge`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: abortController.signal,
  });
}
