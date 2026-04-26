import React from 'react';
import { View } from 'react-native';
import ConditionalScreen from '../components/ConditionalScreen';

export default function ManageScheduleScreen() {
  return (
    <ConditionalScreen screenName="schedule" forceOpenScheduleModal>
      <View />
    </ConditionalScreen>
  );
}

