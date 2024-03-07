package gms.shared.signalenhancementconfiguration.api;

import gms.shared.common.coi.types.PhaseType;
import gms.shared.stationdefinition.coi.qc.ProcessingMaskDefinition;
import gms.shared.stationdefinition.coi.qc.ProcessingOperation;
import gms.shared.stationdefinition.coi.qc.QcSegmentCategory;
import gms.shared.stationdefinition.coi.qc.QcSegmentCategoryAndType;
import gms.shared.stationdefinition.coi.qc.QcSegmentType;
import gms.shared.utilities.test.TestUtilities;
import gms.shared.waveform.testfixture.ChannelSegmentTestFixtures;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;

class ProcessingMaskDefinitionPhaseChannelItemTest {

  @Test
  void testSerializationEmptyListForPhase() {

    var channel1 = ChannelSegmentTestFixtures.getTestChannelE1();

    var phaseChannelItem =
        ProcessingMaskPhaseChannelItem.create(channel1, Map.of(PhaseType.P, List.of()));

    TestUtilities.assertSerializes(phaseChannelItem, ProcessingMaskPhaseChannelItem.class);
  }

  @Test
  void testSerializationComplete() {

    var processingMaskDefinition =
        ProcessingMaskDefinition.create(
            Duration.ofMinutes(8),
            ProcessingOperation.ROTATION,
            Set.of(
                QcSegmentCategoryAndType.create(QcSegmentCategory.WAVEFORM, QcSegmentType.NOISY),
                QcSegmentCategoryAndType.create(QcSegmentCategory.ANALYST_DEFINED)));

    var channel1 = ChannelSegmentTestFixtures.getTestChannelE1();

    var phaseMap1 =
        Map.of(
            PhaseType.Pg, List.of(processingMaskDefinition),
            PhaseType.PnPn, List.of(processingMaskDefinition));

    var phaseChannelItem = ProcessingMaskPhaseChannelItem.create(channel1, phaseMap1);
    TestUtilities.assertSerializes(phaseChannelItem, ProcessingMaskPhaseChannelItem.class);
  }
}
