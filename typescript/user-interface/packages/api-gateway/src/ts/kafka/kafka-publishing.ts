import type { ChannelTypes, SohTypes } from '@gms/common-model';
import config from 'config';

import { gatewayLogger as logger } from '../log/gateway-logger';
import { KafkaProducer } from './kafka-producer';

/** KAFKA settings */
const kafkaSettings = config.get('kafka');

/**
 * Sends (produces) the message to quiet an SOH change to KAFKA.
 */
export const publishQuietedChange = async (
  quieted: SohTypes.QuietedSohStatusChange
): Promise<void> => {
  logger.info(
    `Publishing quiet request for channel ${quieted.channelName} monitor ${quieted.sohMonitorType}`
  );
  // Publish on quiet channel on topic
  await KafkaProducer.Instance().send(kafkaSettings.producerTopics.quietedTopic, [
    { value: JSON.stringify(quieted) }
  ]);
};

/**
 * Sends (produces) the message to acknowledged an SOH change to KAFKA.
 */
export const publishAcknowledgedChange = async (
  acknowledge: SohTypes.AcknowledgedSohStatusChange
): Promise<void> => {
  logger.info(
    `Publishing acknowledge request for station ${acknowledge.acknowledgedStation} by ${acknowledge.acknowledgedBy}`
  );
  // Publish on acknowledgement on topic
  await KafkaProducer.Instance().send(kafkaSettings.producerTopics.acknowledgedTopic, [
    { value: JSON.stringify(acknowledge) }
  ]);
};

/**
 * Publishes a derived channel to Kafka
 *
 * @param derivedChannels the Channel to be sent
 */
export const publishDerivedChannels = async (
  derivedChannels: ChannelTypes.Channel[]
): Promise<void> => {
  logger.info(`Publishing derived channels size: ${derivedChannels.length}`);
  await KafkaProducer.Instance().send(kafkaSettings.producerTopics.derivedChannels, [
    { value: JSON.stringify(derivedChannels) }
  ]);
};
