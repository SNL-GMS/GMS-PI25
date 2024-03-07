PROJECT(UNIT_TESTS LANGUAGES C CXX)
include(FetchContent)

if(DEFINED ENV{CI_REMOTE_REPOSITORY_URL})
        SET(GITHUB_URL $ENV{CI_REMOTE_REPOSITORY_URL}/github-files-remote)
else()
        SET(GITHUB_URL https://github.com)
endif()

FetchContent_Declare(
        googletest
        URL ${GITHUB_URL}/google/googletest/archive/609281088cfefc76f9d0ce82e1ff6c30cc3591e5.zip
)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)
set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(googletest)

SET(TEST_SRC gtest.cpp gtest.hh)

add_executable(GMS_FILTERS_C_TESTS ${TEST_SRC})
target_compile_features(GMS_FILTERS_C_TESTS PUBLIC)
TARGET_LINK_LIBRARIES(GMS_FILTERS_C_TESTS gtest gtest_main gmscfilters)

INCLUDE(GoogleTest)

GTEST_ADD_TESTS(TARGET GMS_FILTERS_C_TESTS old:)
GTEST_DISCOVER_TESTS(GMS_FILTERS_C_TESTS TEST_PREFIX new:)
ADD_TEST(NAME monolithic COMMAND GMS_FILTERS_C_TESTS)
