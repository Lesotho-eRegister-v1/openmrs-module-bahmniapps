'use strict';

angular.module('bahmni.clinical').factory('consultationInitialization',
    ['$q', 'diagnosisService', '$rootScope', 'encounterService', 'sessionService', 'configurations', '$bahmniCookieStore', 'retrospectiveEntryService', 'conditionsService', 'observationsService',
        function ($q, diagnosisService, $rootScope, encounterService, sessionService, configurations, $bahmniCookieStore, retrospectiveEntryService, conditionsService, observationsService) {
            return function (patientUuid, encounterUuid, programUuid, enrollment, followUpConditionConcept) {
                if (encounterUuid === 'active') {
                    encounterUuid = undefined;
                }

                var getEncounterType = function () {
                    return encounterService.getEncounterType(programUuid, sessionService.getLoginLocationUuid());
                };

                var consultationMapper = new Bahmni.ConsultationMapper(configurations.dosageFrequencyConfig(), configurations.dosageInstructionConfig(),
                    configurations.consultationNoteConcept(), configurations.labOrderNotesConcept(), followUpConditionConcept);

                var dateUtil = Bahmni.Common.Util.DateUtil;

                var getActiveEncounter = function () {
                    var currentProviderUuid = $rootScope.currentProvider ? $rootScope.currentProvider.uuid : null;
                    var providerData = $bahmniCookieStore.get(Bahmni.Common.Constants.grantProviderAccessDataCookieName);
                    return findEncounter(providerData, currentProviderUuid, null);
                };

                var getRetrospectiveEncounter = function () {
                    var currentProviderUuid = $rootScope.currentProvider ? $rootScope.currentProvider.uuid : null;
                    var providerData = $bahmniCookieStore.get(Bahmni.Common.Constants.grantProviderAccessDataCookieName);
                    var encounterDateWithoutHours = dateUtil.getDateWithoutHours(retrospectiveEntryService.getRetrospectiveDate());
                    var encounterDate = dateUtil.parseLongDateToServerFormat(encounterDateWithoutHours);
                    return findEncounter(providerData, currentProviderUuid, encounterDate).then(function (consultation) {
                        consultation.encounterDateTime = encounterDateWithoutHours;
                        return consultation;
                    });
                };

                var findEncounter = function (providerData, currentProviderUuid, encounterDate) {
                    return getEncounterType().then(function (encounterType) {
                        return encounterService.find({
                            patientUuid: patientUuid,
                            providerUuids: !_.isEmpty(providerData) ? [providerData.uuid] : [currentProviderUuid],
                            includeAll: Bahmni.Common.Constants.includeAllObservations,
                            encounterDateTimeFrom: encounterDate,
                            encounterDateTimeTo: encounterDate,
                            encounterTypeUuids: [encounterType.uuid],
                            patientProgramUuid: enrollment,
                            locationUuid: $bahmniCookieStore.get(Bahmni.Common.Constants.locationCookieName).uuid
                        }).then(function (encounterTransactionResponse) {
                            return consultationMapper.map(encounterTransactionResponse.data);
                        });
                    });
                };

                var getEncounter = function () {
                    if (encounterUuid) {
                        return encounterService.findByEncounterUuid(encounterUuid).then(function (response) {
                            return consultationMapper.map(response.data);
                        });
                    } else if (!_.isEmpty($rootScope.retrospectiveEntry)) {
                        return getRetrospectiveEncounter();
                    }
                    return getActiveEncounter();
                };

                var fetchAndMergeLatestVitals = function (consultation) {
                    // Only fetch vitals if this is a new consultation (no existing observations for vitals)
                    var hasExistingVitals = _.some(consultation.observations, function (obs) {
                        return obs.concept && obs.concept.name === Bahmni.Common.Constants.vitalsConceptName;
                    });

                    // Don't fetch vitals if:
                    // 1. Vitals already exist in current encounter
                    // 2. encounterUuid is defined (we're editing an existing consultation, not creating a new one)
                    if (hasExistingVitals || encounterUuid) {
                        return $q.when(consultation);
                    }

                    // Fetch latest vitals from any recent encounter (scope: latest, numberOfVisits: 1)
                    return observationsService.fetch(patientUuid, [Bahmni.Common.Constants.vitalsConceptName], 'latest', 1, null, null, null, null)
                        .then(function (response) {
                            if (response.data && response.data.length > 0) {
                                // Add vitals from previous encounter to pre-populate the form
                                var latestVitals = response.data[0];
                                if (latestVitals && latestVitals.groupMembers && latestVitals.groupMembers.length > 0) {
                                    consultation.observations = consultation.observations || [];
                                    consultation.observations.push(latestVitals);
                                }
                            }
                            return consultation;
                        })
                        .catch(function (error) {
                            // If there's an error fetching vitals, just continue without them
                            console.error('Error fetching latest vitals:', error);
                            return consultation;
                        });
                };

                return getEncounter().then(function (consultation) {
                    return fetchAndMergeLatestVitals(consultation);
                }).then(function (consultation) {
                    return diagnosisService.populateDiagnosisInformation(patientUuid, consultation).then(function (diagnosisConsultation) {
                        diagnosisConsultation.preSaveHandler = new Bahmni.Clinical.Notifier();
                        diagnosisConsultation.postSaveHandler = new Bahmni.Clinical.Notifier();
                        return diagnosisConsultation;
                    });
                }).then(function (consultation) {
                    return conditionsService.getConditions(patientUuid).then(function (conditions) {
                        consultation.conditions = conditions;
                        return consultation;
                    });
                });
            };
        }]
);
