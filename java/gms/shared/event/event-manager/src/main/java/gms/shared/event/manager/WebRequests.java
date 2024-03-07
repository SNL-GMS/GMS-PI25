package gms.shared.event.manager;

import com.fasterxml.jackson.core.JsonProcessingException;
import gms.shared.event.coi.LocationSolution;
import gms.shared.event.coi.featureprediction.FeaturePredictionContainer;
import gms.shared.event.manager.config.EventConfigurationResolver;
import gms.shared.featureprediction.request.PredictForLocationRequest;
import gms.shared.featureprediction.request.PredictForLocationSolutionAndChannelRequest;
import gms.shared.stationdefinition.coi.channel.Channel;
import gms.shared.utilities.javautilities.objectmapper.ObjectMapperFactory;
import java.net.URI;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;
import org.apache.commons.lang3.tuple.Pair;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.ExchangeFilterFunction;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

/**
 * A utility for constructing and sending a request to the {@link
 * gms.shared.event.coi.featureprediction.FeaturePrediction} service
 */
@Component
class WebRequests {

  private static final Logger LOGGER = LoggerFactory.getLogger(WebRequests.class);
  private static final int CUSTOM_PARTIAL_RESPONSE_CODE = 209;
  private static final int MAX_LEN_ERR_MSG = 100;

  private final WebClient.Builder webClientBuilder;
  private final URI predictForLocationUri;
  private final URI predictForLocationSolutionAndChannelUri;

  @Autowired
  WebRequests(
      EventConfigurationResolver eventManagerConfiguration, WebClient.Builder webClientBuilder) {
    this.predictForLocationUri = eventManagerConfiguration.resolvePredictForLocationUrl();
    this.predictForLocationSolutionAndChannelUri =
        eventManagerConfiguration.resolvePredictForLocationSolutionAndChannelUrl();
    this.webClientBuilder = webClientBuilder;
  }

  /**
   * Communicates with Feature Prediction Service
   *
   * @param predictForLocationSolutionAndChannelRequest {@link
   *     PredictForLocationSolutionAndChannelRequest} request body to sent to Feature Prediction
   *     Service
   * @return a Pair of{@link LocationSolution} processed by Feature Prediction Service and an
   *     Boolean indication partial results or not
   * @throws FeaturePredictionException When not able to communicate or parse data from Feature
   *     Prediction Service
   */
  Pair<Optional<LocationSolution>, Boolean> fpsWebRequestPredictForLocationSolutionAndChannel(
      PredictForLocationSolutionAndChannelRequest predictForLocationSolutionAndChannelRequest)
      throws FeaturePredictionException {

    var baseLogMsg =
        "Querying FeaturePredictorService endpoint " + predictForLocationSolutionAndChannelUri;
    if (LOGGER.isDebugEnabled()) {
      createPredictForLocationSolutionLogger(
          baseLogMsg, predictForLocationSolutionAndChannelRequest);
    } else {
      LOGGER.info(baseLogMsg);
    }

    var partialResult = new AtomicBoolean(false);
    var partialResultsResponseFilter =
        ExchangeFilterFunction.ofResponseProcessor(
            s -> exchangeFilterResponseProcessor(s, partialResult));
    var locationSolutionJson =
        this.webClientBuilder
            .filter(partialResultsResponseFilter)
            .build()
            .post()
            .uri(predictForLocationSolutionAndChannelUri)
            .bodyValue(predictForLocationSolutionAndChannelRequest)
            .retrieve()
            .onStatus(
                HttpStatusCode::is4xxClientError,
                response ->
                    Mono.error(
                        new FeaturePredictionException(
                            "FeaturePredictionService failed with Client Error")))
            .onStatus(
                HttpStatusCode::is5xxServerError,
                response ->
                    Mono.error(
                        new FeaturePredictionException(
                            "FeaturePredictionService failed with Server Error")))
            .bodyToMono(String.class)
            .blockOptional()
            .orElseThrow(
                () ->
                    new FeaturePredictionException(
                        "Unable to process empty response from FeaturePredictionService"));

    try {
      if (locationSolutionJson.isEmpty() || locationSolutionJson.isBlank()) {
        return Pair.of(Optional.empty(), partialResult.get());
      } else {
        return Pair.of(
            Optional.ofNullable(
                ObjectMapperFactory.getJsonObjectMapper()
                    .readValue(locationSolutionJson, LocationSolution.class)),
            partialResult.get());
      }
    } catch (JsonProcessingException e) {
      LOGGER.warn("Caught and dealt with JsonProcessingException", e);
      var locationSolutionString =
          locationSolutionJson.length() > MAX_LEN_ERR_MSG
              ? (locationSolutionJson.substring(0, MAX_LEN_ERR_MSG) + "...")
              : locationSolutionJson;
      var errorMessage = "Unable to convert to LocationSolution [{" + locationSolutionString + "}]";
      throw new FeaturePredictionException(errorMessage);
    }
  }

  Pair<Optional<FeaturePredictionContainer>, Boolean> fpsWebRequestPredictForLocation(
      PredictForLocationRequest predictForLocationRequest) throws FeaturePredictionException {

    var baseLogMsg = "Querying FeaturePredictorService endpoint " + predictForLocationUri;
    if (LOGGER.isDebugEnabled()) {
      createPredictForLocationLogger(baseLogMsg, predictForLocationRequest);
    } else {
      LOGGER.info(baseLogMsg);
    }

    var partialResult = new AtomicBoolean(false);
    var partialResultsResponseFilter =
        ExchangeFilterFunction.ofResponseProcessor(
            s -> exchangeFilterResponseProcessor(s, partialResult));
    var locationJson =
        this.webClientBuilder
            .filter(partialResultsResponseFilter)
            .build()
            .post()
            .uri(predictForLocationUri)
            .bodyValue(predictForLocationRequest)
            .retrieve()
            .onStatus(
                HttpStatusCode::is4xxClientError,
                response ->
                    Mono.error(
                        new FeaturePredictionException(
                            "FeaturePredictionService failed with Client Error")))
            .onStatus(
                HttpStatusCode::is5xxServerError,
                response ->
                    Mono.error(
                        new FeaturePredictionException(
                            "FeaturePredictionService failed with Server Error")))
            .bodyToMono(String.class)
            .onErrorResume(
                FeaturePredictionException.class,
                e -> {
                  LOGGER.warn(
                      "Caught FeaturePredictionException, unable to include those predictions in"
                          + " the response",
                      e);
                  String emptyFeaturePredictionContainerJson;
                  try {
                    emptyFeaturePredictionContainerJson =
                        ObjectMapperFactory.getJsonObjectMapper()
                            .writeValueAsString(FeaturePredictionContainer.create(Set.of()));
                  } catch (JsonProcessingException ex) {
                    LOGGER.warn("Caught and handled JsonProcessingException", ex);
                    emptyFeaturePredictionContainerJson = "[]";
                  }
                  return Mono.just(emptyFeaturePredictionContainerJson);
                })
            .blockOptional()
            .orElseThrow(
                () ->
                    new FeaturePredictionException(
                        "Unable to process empty response from FeaturePredictionService"));

    try {

      if (locationJson.isEmpty() || locationJson.isBlank()) {
        return Pair.of(Optional.empty(), partialResult.get());
      } else {
        return Pair.of(
            Optional.ofNullable(
                ObjectMapperFactory.getJsonObjectMapper()
                    .readValue(locationJson, FeaturePredictionContainer.class)),
            partialResult.get());
      }
    } catch (JsonProcessingException e) {
      LOGGER.warn("Caught and handled JsonProcessingException", e);
      var locationString =
          locationJson.length() > MAX_LEN_ERR_MSG
              ? (locationJson.substring(0, MAX_LEN_ERR_MSG) + "...")
              : locationJson;
      var errorMessage =
          "Unable to convert to FeaturePredictionContainer [{" + locationString + "}]";
      throw new FeaturePredictionException(errorMessage);
    }
  }

  private static void createPredictForLocationLogger(
      String baseLogMsg, PredictForLocationRequest predictForLocationRequest) {
    LOGGER.debug(
        "{} with request... "
            + "FeaturePredictionTypes: {}"
            + ", ReceiverLocations: {}"
            + ", SourceLocation: {}"
            + ", Phases: {}"
            + ", EarthModel: {}",
        baseLogMsg,
        predictForLocationRequest.getPredictionTypes(),
        predictForLocationRequest.getReceiverLocations(),
        predictForLocationRequest.getSourceLocation(),
        predictForLocationRequest.getPhases(),
        predictForLocationRequest.getEarthModel());
  }

  private static void createPredictForLocationSolutionLogger(
      String baseLogMsg,
      PredictForLocationSolutionAndChannelRequest predictForLocationSolutionAndChannelRequest) {
    LOGGER.debug(
        "{} with request... "
            + "FeaturePredictionTypes: {}"
            + ", Channels: {}"
            + ", Phases: {}"
            + ", EarthModel: {}"
            + ", EventLocation: {}",
        baseLogMsg,
        predictForLocationSolutionAndChannelRequest.getPredictionTypes(),
        predictForLocationSolutionAndChannelRequest.getReceivingChannels().stream()
            .map(Channel::getName)
            .collect(Collectors.toSet()),
        predictForLocationSolutionAndChannelRequest.getPhases(),
        predictForLocationSolutionAndChannelRequest.getEarthModel(),
        predictForLocationSolutionAndChannelRequest
            .getSourceLocationSolution()
            .getData()
            .orElseThrow()
            .getLocation());
  }

  private static Mono<ClientResponse> exchangeFilterResponseProcessor(
      ClientResponse response, AtomicBoolean atomicBoolean) {
    if (response.statusCode().value() == CUSTOM_PARTIAL_RESPONSE_CODE) {
      atomicBoolean.set(true);
    }
    // simply passon response as we only want to detect our custom 209 results without error
    return Mono.just(response);
  }
}
