# Manual Testing Guide for Vitals Pre-fill Feature

## Overview
This feature allows vitals captured in the registration module to automatically pre-fill in the clinical module's vitals form when starting a new consultation.

## Prerequisites
- Access to Bahmni system with both registration and clinical modules
- Test patient record
- User accounts with appropriate privileges (data capturer and clinician)

## Testing Scenarios

### Scenario 1: New Patient with Vitals Captured in Registration
**Objective**: Verify that vitals captured in registration appear in clinical consultation

**Steps**:
1. **As Data Capturer in Registration Module**:
   - Navigate to Registration module
   - Create or open a patient record
   - Navigate to the Visit/Consultation page in registration
   - Enter vitals data (e.g., Height: 170 cm, Weight: 70 kg, BMI, etc.)
   - Save the encounter
   - Note the values entered

2. **As Clinician in Clinical Module**:
   - Navigate to Clinical module
   - Search for and open the same patient record
   - Click the "Consultation" button to start a new consultation
   - Navigate to the Vitals section/form
   
**Expected Result**:
- The vitals form should be pre-filled with the values entered in registration
- All vitals fields (Height, Weight, BMI, Blood Pressure, etc.) should display the previously captured values
- The clinician can view and modify these values if needed

**Pass Criteria**: ✓ Vitals from registration appear in the clinical vitals form

---

### Scenario 2: Existing Consultation with Vitals Already Captured
**Objective**: Verify that existing vitals in clinical encounter are not overwritten

**Steps**:
1. **As Data Capturer in Registration**:
   - Open a patient and enter vitals: Height: 165 cm, Weight: 60 kg
   - Save the encounter

2. **As Clinician in Clinical Module**:
   - Open the same patient
   - Start a new consultation
   - Enter different vitals: Height: 170 cm, Weight: 70 kg
   - Save the consultation

3. **As Clinician** (continuing):
   - Re-open the same consultation (edit mode)
   - Check the vitals values

**Expected Result**:
- The vitals should show the clinical values (170 cm, 70 kg), not the registration values
- The system should NOT overwrite clinician-entered vitals with registration data

**Pass Criteria**: ✓ Clinical vitals are preserved and not overwritten

---

### Scenario 3: Multiple Encounters with Different Vitals
**Objective**: Verify that the LATEST vitals are used for pre-filling

**Steps**:
1. **First Registration Encounter**:
   - Enter vitals: Height: 160 cm, Weight: 55 kg
   - Save the encounter

2. **Second Registration Encounter** (same day or later):
   - Enter updated vitals: Height: 162 cm, Weight: 58 kg
   - Save the encounter

3. **Start Clinical Consultation**:
   - Open patient in clinical module
   - Start a new consultation
   - Check the vitals form

**Expected Result**:
- The vitals form should show the LATEST values (162 cm, 58 kg)
- Not the older values from the first encounter

**Pass Criteria**: ✓ Latest vitals values are displayed

---

### Scenario 4: Patient with No Prior Vitals
**Objective**: Verify system handles patients without vitals gracefully

**Steps**:
1. **As Data Capturer in Registration**:
   - Create a new patient
   - Do NOT enter any vitals
   - Save the record

2. **As Clinician in Clinical Module**:
   - Open the patient record
   - Start a new consultation
   - Navigate to the vitals form

**Expected Result**:
- The vitals form should be empty (no pre-filled values)
- The consultation should load normally without errors
- The clinician can enter vitals as usual

**Pass Criteria**: ✓ System handles missing vitals gracefully

---

### Scenario 5: Editing an Existing Consultation
**Objective**: Verify that editing an existing consultation doesn't fetch registration vitals

**Steps**:
1. **As Data Capturer in Registration**:
   - Enter vitals: Height: 165 cm
   - Save

2. **As Clinician**:
   - Start a new consultation (should see 165 cm pre-filled)
   - Change Height to 170 cm
   - Save the consultation

3. **Edit the Consultation**:
   - Re-open the saved consultation in edit mode
   - Check the vitals

**Expected Result**:
- The vitals should show 170 cm (the clinical value)
- The system should NOT re-fetch and show 165 cm from registration

**Pass Criteria**: ✓ Editing preserves consultation vitals

---

## Verification Checklist

- [ ] Vitals captured in registration appear in clinical consultation
- [ ] System uses the latest vitals from any encounter type
- [ ] Existing clinical vitals are not overwritten
- [ ] System handles patients with no vitals gracefully
- [ ] Editing consultations preserves the consultation's own vitals
- [ ] No JavaScript errors in browser console
- [ ] No performance degradation when loading consultations
- [ ] Data is saved correctly in the backend

## Error Scenarios to Check

### Network Failure
- Disconnect network briefly when starting consultation
- Verify consultation still loads (without vitals)
- Check browser console for error handling

### Invalid Data
- Create a vitals record with missing required fields
- Verify system handles it gracefully

## Browser Console Debugging

If vitals are not appearing:
1. Open browser developer console (F12)
2. Look for errors related to:
   - `fetchAndMergeLatestVitals`
   - `observationsService.fetch`
   - `consultationInitialization`
3. Check network tab for failed API calls to `/openmrs/ws/rest/v1/bahmnicore/observations`

## Success Indicators

✓ Data capturer can enter vitals once in registration
✓ Clinician sees pre-filled vitals in clinical consultation
✓ Clinician can modify pre-filled values as needed
✓ System maintains data integrity across encounters
✓ No duplicate data entry required

## Reporting Issues

If any test fails, document:
- Scenario that failed
- Steps to reproduce
- Expected vs actual behavior
- Browser console errors (if any)
- Network requests (from browser dev tools)
