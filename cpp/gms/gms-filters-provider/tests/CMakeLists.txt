PROJECT(UNIT_TESTS LANGUAGES C CXX)
include(FetchContent)

if(DEFINED ENV{CI_REMOTE_REPOSITORY_URL})
        SET(GITHUB_URL $ENV{CI_REMOTE_REPOSITORY_URL}/github-files-remote)
else()
        SET(GITHUB_URL https://github.com)
endif()

FetchContent_Declare(
        googletest
        GIT_REPOSITORY ${GITHUB_URL}/google/googletest.git
        GIT_TAG        release-1.13.0
)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)
set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(googletest)

SET(TEST_SRC
        BaseFilterApplyTests.hh BaseFilterApplyTests.cpp
        FilterDesignerTests.hh FilterDesignerTests.cpp
        FilterProviderTests.hh FilterProviderTests.cpp
        TaperTests.hh TaperTests.cpp
        TestUtils.hh TestUtils.cpp
        WasmFilterApplyTests.hh WasmFilterApplyTests.cpp
        WasmFilterDesignerTests.hh WasmFilterDesignerTests.cpp
        payloads/TestData.hh payloads/TestData.cpp
        payloads/TestFilters.hh payloads/TestFilters.cpp
)

add_executable(GMS_FILTERS_PROVIDER_CPP_TESTS ${TEST_SRC})
target_compile_features(GMS_FILTERS_PROVIDER_CPP_TESTS PUBLIC)
TARGET_LINK_LIBRARIES(GMS_FILTERS_PROVIDER_CPP_TESTS gtest gtest_main gmsfiltersprovider)

INCLUDE(GoogleTest)

GTEST_ADD_TESTS(TARGET GMS_FILTERS_PROVIDER_CPP_TESTS old:)
GTEST_DISCOVER_TESTS(GMS_FILTERS_PROVIDER_CPP_TESTS TEST_PREFIX new:)
ADD_TEST(NAME monolithic COMMAND GMS_FILTERS_PROVIDER_CPP_TESTS)
