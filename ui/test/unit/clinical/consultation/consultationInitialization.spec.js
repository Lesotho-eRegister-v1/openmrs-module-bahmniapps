'use strict';

describe('consultationInitialization', function () {
    var consultationInitialization, $q, $rootScope, diagnosisService, encounterService, 
        sessionService, configurations, $bahmniCookieStore, retrospectiveEntryService, 
        conditionsService, observationsService;

    var patientUuid = 'patient-uuid-123';
    var encounterUuid = undefined;
    var programUuid = undefined;
    var enrollment = undefined;
    var followUpConditionConcept = {uuid: 'follow-up-concept-uuid'};

    beforeEach(module('bahmni.clinical'));

    beforeEach(inject(function (_consultationInitialization_, _$q_, _$rootScope_) {
        consultationInitialization = _consultationInitialization_;
        $q = _$q_;
        $rootScope = _$rootScope_;

        // Mock services
        diagnosisService = jasmine.createSpyObj('diagnosisService', ['populateDiagnosisInformation']);
        encounterService = jasmine.createSpyObj('encounterService', ['find', 'findByEncounterUuid', 'getEncounterType']);
        sessionService = jasmine.createSpyObj('sessionService', ['getLoginLocationUuid']);
        configurations = jasmine.createSpyObj('configurations', ['dosageFrequencyConfig', 'dosageInstructionConfig', 'consultationNoteConcept', 'labOrderNotesConcept']);
        $bahmniCookieStore = jasmine.createSpyObj('$bahmniCookieStore', ['get']);
        retrospectiveEntryService = jasmine.createSpyObj('retrospectiveEntryService', ['getRetrospectiveDate']);
        conditionsService = jasmine.createSpyObj('conditionsService', ['getConditions']);
        observationsService = jasmine.createSpyObj('observationsService', ['fetch']);

        // Setup basic mock responses
        sessionService.getLoginLocationUuid.and.returnValue('location-uuid');
        configurations.dosageFrequencyConfig.and.returnValue({});
        configurations.dosageInstructionConfig.and.returnValue({});
        configurations.consultationNoteConcept.and.returnValue({uuid: 'consultation-note-uuid'});
        configurations.labOrderNotesConcept.and.returnValue({uuid: 'lab-order-note-uuid'});
        $bahmniCookieStore.get.and.returnValue({uuid: 'location-uuid'});
        conditionsService.getConditions.and.returnValue($q.when([]));

        $rootScope.currentProvider = {uuid: 'provider-uuid'};
    }));

    describe('Vitals pre-fill from registration', function () {
        
        it('should fetch and merge latest vitals when starting a new consultation without existing vitals', function (done) {
            var encounterResponse = {
                data: {
                    encounterUuid: 'new-encounter-uuid',
                    observations: [],
                    orders: [],
                    drugOrders: [],
                    visitUuid: 'visit-uuid',
                    visitTypeUuid: 'visit-type-uuid',
                    patientUuid: patientUuid,
                    extensions: {}
                }
            };

            var vitalsObservation = {
                concept: {
                    uuid: 'vitals-concept-uuid',
                    name: 'Vitals'
                },
                groupMembers: [
                    {
                        concept: {uuid: 'height-uuid', name: 'HEIGHT'},
                        value: 170
                    },
                    {
                        concept: {uuid: 'weight-uuid', name: 'WEIGHT'},
                        value: 70
                    }
                ]
            };

            encounterService.getEncounterType.and.returnValue($q.when({uuid: 'encounter-type-uuid'}));
            encounterService.find.and.returnValue($q.when(encounterResponse));
            observationsService.fetch.and.returnValue($q.when({data: [vitalsObservation]}));
            diagnosisService.populateDiagnosisInformation.and.returnValue($q.when({
                observations: [vitalsObservation],
                preSaveHandler: jasmine.createSpyObj('preSaveHandler', ['register']),
                postSaveHandler: jasmine.createSpyObj('postSaveHandler', ['register'])
            }));

            consultationInitialization(patientUuid, encounterUuid, programUuid, enrollment, followUpConditionConcept)
                .then(function (consultation) {
                    // Verify that observationsService.fetch was called to get latest vitals
                    expect(observationsService.fetch).toHaveBeenCalledWith(
                        patientUuid, 
                        ['Vitals'], 
                        'latest', 
                        1, 
                        null, 
                        null, 
                        null, 
                        null
                    );
                    
                    // Verify that vitals were added to consultation observations
                    expect(consultation.observations).toContain(vitalsObservation);
                    done();
                })
                .catch(done.fail);

            $rootScope.$apply();
        });

        it('should not fetch vitals when editing an existing encounter', function (done) {
            var existingEncounterUuid = 'existing-encounter-uuid';
            var encounterResponse = {
                data: {
                    encounterUuid: existingEncounterUuid,
                    observations: [],
                    orders: [],
                    drugOrders: [],
                    visitUuid: 'visit-uuid',
                    visitTypeUuid: 'visit-type-uuid',
                    patientUuid: patientUuid,
                    extensions: {}
                }
            };

            encounterService.findByEncounterUuid.and.returnValue($q.when(encounterResponse));
            diagnosisService.populateDiagnosisInformation.and.returnValue($q.when({
                observations: [],
                preSaveHandler: jasmine.createSpyObj('preSaveHandler', ['register']),
                postSaveHandler: jasmine.createSpyObj('postSaveHandler', ['register'])
            }));

            consultationInitialization(patientUuid, existingEncounterUuid, programUuid, enrollment, followUpConditionConcept)
                .then(function (consultation) {
                    // Verify that observationsService.fetch was NOT called since we're editing
                    expect(observationsService.fetch).not.toHaveBeenCalled();
                    done();
                })
                .catch(done.fail);

            $rootScope.$apply();
        });

        it('should not fetch vitals when vitals already exist in current encounter', function (done) {
            var existingVitals = {
                concept: {
                    uuid: 'vitals-concept-uuid',
                    name: 'Vitals'
                },
                groupMembers: []
            };

            var encounterResponse = {
                data: {
                    encounterUuid: 'new-encounter-uuid',
                    observations: [existingVitals],
                    orders: [],
                    drugOrders: [],
                    visitUuid: 'visit-uuid',
                    visitTypeUuid: 'visit-type-uuid',
                    patientUuid: patientUuid,
                    extensions: {}
                }
            };

            encounterService.getEncounterType.and.returnValue($q.when({uuid: 'encounter-type-uuid'}));
            encounterService.find.and.returnValue($q.when(encounterResponse));
            diagnosisService.populateDiagnosisInformation.and.returnValue($q.when({
                observations: [existingVitals],
                preSaveHandler: jasmine.createSpyObj('preSaveHandler', ['register']),
                postSaveHandler: jasmine.createSpyObj('postSaveHandler', ['register'])
            }));

            consultationInitialization(patientUuid, encounterUuid, programUuid, enrollment, followUpConditionConcept)
                .then(function (consultation) {
                    // Verify that observationsService.fetch was NOT called since vitals exist
                    expect(observationsService.fetch).not.toHaveBeenCalled();
                    expect(consultation.observations).toContain(existingVitals);
                    done();
                })
                .catch(done.fail);

            $rootScope.$apply();
        });

        it('should handle errors gracefully when fetching vitals fails', function (done) {
            var encounterResponse = {
                data: {
                    encounterUuid: 'new-encounter-uuid',
                    observations: [],
                    orders: [],
                    drugOrders: [],
                    visitUuid: 'visit-uuid',
                    visitTypeUuid: 'visit-type-uuid',
                    patientUuid: patientUuid,
                    extensions: {}
                }
            };

            encounterService.getEncounterType.and.returnValue($q.when({uuid: 'encounter-type-uuid'}));
            encounterService.find.and.returnValue($q.when(encounterResponse));
            observationsService.fetch.and.returnValue($q.reject({error: 'Failed to fetch vitals'}));
            diagnosisService.populateDiagnosisInformation.and.returnValue($q.when({
                observations: [],
                preSaveHandler: jasmine.createSpyObj('preSaveHandler', ['register']),
                postSaveHandler: jasmine.createSpyObj('postSaveHandler', ['register'])
            }));

            consultationInitialization(patientUuid, encounterUuid, programUuid, enrollment, followUpConditionConcept)
                .then(function (consultation) {
                    // Verify consultation still succeeds even if vitals fetch fails
                    expect(consultation).toBeDefined();
                    expect(consultation.observations).toEqual([]);
                    done();
                })
                .catch(done.fail);

            $rootScope.$apply();
        });
    });
});
