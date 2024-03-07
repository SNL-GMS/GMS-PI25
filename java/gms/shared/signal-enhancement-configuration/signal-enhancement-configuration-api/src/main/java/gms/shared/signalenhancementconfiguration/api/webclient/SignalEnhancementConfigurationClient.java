package gms.shared.signalenhancementconfiguration.api.webclient;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.base.Preconditions;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByUsageBySignalDetectionHypothesis;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByUsageForSignalDetectionHypothesesRequest;
import gms.shared.signalenhancementconfiguration.api.webclient.config.SignalEnhancementConfigurationClientConfig;
import gms.shared.stationdefinition.coi.utils.CoiObjectMapperFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

@Component
public class SignalEnhancementConfigurationClient {

  private static final Logger LOGGER =
      LoggerFactory.getLogger(SignalEnhancementConfigurationClient.class);

  private final WebClient.Builder clientBuilder;

  private final SignalEnhancementConfigurationClientConfig clientConfig;

  private final ObjectMapper mapper = CoiObjectMapperFactory.getJsonObjectMapper();

  @Autowired
  public SignalEnhancementConfigurationClient(
      WebClient.Builder clientBuilder, SignalEnhancementConfigurationClientConfig config) {
    this.clientBuilder =
        clientBuilder.defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE);
    this.clientConfig = config;
  }

  public Mono<FilterDefinitionByUsageBySignalDetectionHypothesis>
      queryDefaultFilterDefByUsageForSDHs(
          FilterDefinitionByUsageForSignalDetectionHypothesesRequest request) {

    Preconditions.checkNotNull(request, "Cannot query service with null request");

    LOGGER.debug(
        "Querying SignalEnhancementConfiguration endpoint {} with request... {}",
        clientConfig.filterDefsByUsageForSDHsUrl(),
        request);

    return clientBuilder
        .build()
        .post()
        .uri(clientConfig.filterDefsByUsageForSDHsUrl())
        .accept(MediaType.APPLICATION_JSON)
        .bodyValue(request)
        .retrieve()
        .bodyToMono(
            String.class) // TODO: Determine why declaring an specific class type here throws
        // `UnsupportedMediaTypeException`
        .retryWhen(
            clientConfig
                .retrySpec()
                .doBeforeRetry(
                    retry ->
                        LOGGER.warn(
                            "Attempt to query for default filter definitions failed. Retrying...",
                            retry.failure()))
                .filter(
                    exception ->
                        !(exception instanceof WebClientResponseException wcre)
                            || !(wcre.getStatusCode().is4xxClientError())))
        .flatMap(
            bodyString -> {
              try {
                return Mono.just(
                    mapper.readValue(
                        bodyString, FilterDefinitionByUsageBySignalDetectionHypothesis.class));
              } catch (JsonProcessingException ex) {
                return Mono.error(ex);
              }
            });
  }
}
